import React from 'react';
import Svg, { Text as SvgText, TSpan } from 'react-native-svg';

interface AbstractsLogoProps {
  width?: number;
  height?: number;
  textColor?: string;
  primaryColor?: string;
}

export const AbstractsLogo: React.FC<AbstractsLogoProps> = ({
  width = 180,
  height = 50,
  textColor = '#FFFFFF',
  primaryColor = '#2F6FED',
}) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 340 90">
      {/* Clean Typography Wordmark */}
      <SvgText
        x="0"
        y="70"
        fontFamily="System"
        fontWeight="800"
        fontSize="76"
        letterSpacing="-1.5"
      >
        <TSpan fill={textColor}>Abs</TSpan>
        <TSpan fill={primaryColor}>tracts</TSpan>
      </SvgText>
    </Svg>
  );
};

