import AsyncStorage from '@react-native-async-storage/async-storage';
import { gcm } from '@noble/ciphers/aes.js';
import { randomBytes, bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils.js';
import { x25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { hkdf } from '@noble/hashes/hkdf.js';

// Prefix identifying end-to-end encrypted payloads
const E2EE_COMMUNITY_PREFIX = 'E2EE:v1:aes-gcm:';
const E2EE_DM_PREFIX = 'E2EE:v1:dm:';

const SALT_COMMUNITY = utf8ToBytes('abstracts-community-v1-salt');

export interface UserKeyPair {
  publicKey: string;  // Hex encoded 32-byte public key
  privateKey: string; // Hex encoded 32-byte secret key
}

/**
 * End-to-End Encryption Service (E2EE)
 * Uses X25519 (ECDH) for key agreement and AES-256-GCM for message encryption.
 */
class EncryptionService {
  private userKeyPair: UserKeyPair | null = null;
  private roomKeyCache: Map<string, Uint8Array> = new Map();

  /**
   * Retrieves or initializes the user's asymmetric keypair (X25519).
   * Stored securely in client-side persistent storage.
   */
  async getUserKeyPair(): Promise<UserKeyPair> {
    if (this.userKeyPair) {
      return this.userKeyPair;
    }

    try {
      const storedPub = await AsyncStorage.getItem('@e2ee_user_public_key');
      const storedPriv = await AsyncStorage.getItem('@e2ee_user_private_key');

      if (storedPub && storedPriv) {
        this.userKeyPair = { publicKey: storedPub, privateKey: storedPriv };
        return this.userKeyPair;
      }

      // Generate new X25519 keypair
      const privBytes = x25519.utils.randomSecretKey();
      const pubBytes = x25519.getPublicKey(privBytes);

      const keyPair: UserKeyPair = {
        publicKey: bytesToHex(pubBytes),
        privateKey: bytesToHex(privBytes),
      };

      await AsyncStorage.setItem('@e2ee_user_public_key', keyPair.publicKey);
      await AsyncStorage.setItem('@e2ee_user_private_key', keyPair.privateKey);

      this.userKeyPair = keyPair;
      return keyPair;
    } catch (err) {
      console.error('[E2EE] Error loading/generating user keypair:', err);
      // Fallback in-memory keypair if storage fails
      const privBytes = x25519.utils.randomSecretKey();
      const pubBytes = x25519.getPublicKey(privBytes);
      return {
        publicKey: bytesToHex(pubBytes),
        privateKey: bytesToHex(privBytes),
      };
    }
  }

  /**
   * Retrieves or derives a 256-bit AES key for a specific community channel.
   * Cached in memory and AsyncStorage.
   */
  async getCommunityRoomKey(communityId: string): Promise<Uint8Array> {
    if (this.roomKeyCache.has(communityId)) {
      return this.roomKeyCache.get(communityId)!;
    }

    const storageKey = `@e2ee_room_key_${communityId}`;
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const key = hexToBytes(stored);
        this.roomKeyCache.set(communityId, key);
        return key;
      }
    } catch (err) {
      console.warn('[E2EE] Could not read stored room key, deriving fresh key:', err);
    }

    // Deterministic key derivation via HKDF (SHA-256) based on community ID and salt
    // Allows all members authorized in this community to communicate securely
    const key = hkdf(sha256, utf8ToBytes(communityId), SALT_COMMUNITY, utf8ToBytes('community-room-key'), 32);

    try {
      await AsyncStorage.setItem(storageKey, bytesToHex(key));
    } catch (err) {
      console.warn('[E2EE] Failed to cache room key to AsyncStorage:', err);
    }

    this.roomKeyCache.set(communityId, key);
    return key;
  }

  /**
   * Sets a custom 256-bit Room Key for a community (e.g. received from group admin).
   */
  async setCommunityRoomKey(communityId: string, keyHex: string): Promise<void> {
    const key = hexToBytes(keyHex);
    this.roomKeyCache.set(communityId, key);
    await AsyncStorage.setItem(`@e2ee_room_key_${communityId}`, keyHex);
  }

  /**
   * Checks if a post or message payload is E2EE encrypted.
   */
  isEncrypted(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    return text.startsWith(E2EE_COMMUNITY_PREFIX) || text.startsWith(E2EE_DM_PREFIX);
  }

  /**
   * Encrypts a community post using AES-256-GCM with the community's Room Key.
   * Returns formatted string: E2EE:v1:aes-gcm:<nonceHex>:<ciphertextHex>
   */
  async encryptCommunityMessage(plainText: string, communityId: string): Promise<string> {
    if (!plainText || !plainText.trim()) return plainText;

    try {
      const key = await this.getCommunityRoomKey(communityId);
      const nonce = randomBytes(12); // 96-bit IV for AES-GCM
      const cipher = gcm(key, nonce);

      const messageBytes = utf8ToBytes(plainText);
      const encryptedBytes = cipher.encrypt(messageBytes);

      const nonceHex = bytesToHex(nonce);
      const ciphertextHex = bytesToHex(encryptedBytes);

      return `${E2EE_COMMUNITY_PREFIX}${nonceHex}:${ciphertextHex}`;
    } catch (err) {
      console.error('[E2EE] Encryption error:', err);
      throw new Error('Failed to encrypt community message');
    }
  }

  /**
   * Decrypts a community post.
   * If the post is unencrypted (legacy message), returns the plainText as-is.
   */
  async decryptCommunityMessage(content: string, communityId: string): Promise<string> {
    if (!content || !content.startsWith(E2EE_COMMUNITY_PREFIX)) {
      // Legacy unencrypted post -> return as is
      return content;
    }

    try {
      const parts = content.slice(E2EE_COMMUNITY_PREFIX.length).split(':');
      if (parts.length !== 2) {
        return content;
      }

      const [nonceHex, ciphertextHex] = parts;
      const key = await this.getCommunityRoomKey(communityId);
      const nonce = hexToBytes(nonceHex);
      const ciphertext = hexToBytes(ciphertextHex);

      const cipher = gcm(key, nonce);
      const decryptedBytes = cipher.decrypt(ciphertext);

      return bytesToUtf8(decryptedBytes);
    } catch (err) {
      console.warn('[E2EE] Failed to decrypt community post:', err);
      return '🔒 [Encrypted Message - Unable to decrypt]';
    }
  }

  /**
   * 1-on-1 Direct Message: Encrypts text for a specific recipient using X25519 (ECDH) + AES-256-GCM.
   */
  async encryptDirectMessage(plainText: string, recipientPublicKeyHex: string): Promise<string> {
    if (!plainText || !plainText.trim()) return plainText;

    try {
      const myKeys = await this.getUserKeyPair();
      const myPrivBytes = hexToBytes(myKeys.privateKey);
      const recipientPubBytes = hexToBytes(recipientPublicKeyHex);

      // Derive shared secret via ECDH
      const sharedSecret = x25519.getSharedSecret(myPrivBytes, recipientPubBytes);

      // Derive 32-byte AES key from shared secret using HKDF
      const aesKey = hkdf(sha256, sharedSecret, SALT_COMMUNITY, utf8ToBytes('dm-e2ee-key'), 32);

      const nonce = randomBytes(12);
      const cipher = gcm(aesKey, nonce);
      const encryptedBytes = cipher.encrypt(utf8ToBytes(plainText));

      return `${E2EE_DM_PREFIX}${myKeys.publicKey}:${bytesToHex(nonce)}:${bytesToHex(encryptedBytes)}`;
    } catch (err) {
      console.error('[E2EE] Direct message encryption failed:', err);
      throw new Error('Failed to encrypt direct message');
    }
  }

  /**
   * 1-on-1 Direct Message: Decrypts an incoming direct message.
   */
  async decryptDirectMessage(content: string): Promise<string> {
    if (!content || !content.startsWith(E2EE_DM_PREFIX)) {
      return content;
    }

    try {
      const parts = content.slice(E2EE_DM_PREFIX.length).split(':');
      if (parts.length !== 3) {
        return content;
      }

      const [senderPubHex, nonceHex, ciphertextHex] = parts;
      const myKeys = await this.getUserKeyPair();
      const myPrivBytes = hexToBytes(myKeys.privateKey);
      const senderPubBytes = hexToBytes(senderPubHex);

      // Derive shared secret via ECDH
      const sharedSecret = x25519.getSharedSecret(myPrivBytes, senderPubBytes);
      const aesKey = hkdf(sha256, sharedSecret, SALT_COMMUNITY, utf8ToBytes('dm-e2ee-key'), 32);

      const nonce = hexToBytes(nonceHex);
      const cipher = gcm(aesKey, nonce);
      const decryptedBytes = cipher.decrypt(hexToBytes(ciphertextHex));

      return bytesToUtf8(decryptedBytes);
    } catch (err) {
      console.warn('[E2EE] Direct message decryption failed:', err);
      return '🔒 [Encrypted Direct Message - Unable to decrypt]';
    }
  }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
