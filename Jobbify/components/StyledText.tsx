import { Text, TextProps } from './Themed';

export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}

export function RegularText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'PoppinsRegular' }]} />;
}

export function MediumText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'PoppinsMedium' }]} />;
}

export function BoldText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'PoppinsBold' }]} />;
}
