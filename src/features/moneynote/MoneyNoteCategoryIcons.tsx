import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

type MoneyNoteCategoryIconProps = {
  icon: string;
  size?: number;
};

const categoryIconSources: Record<string, ImageSourcePropType> = {
  'bottle-soda-outline': require('../../../assets/images/moneynote/categories/expense-daily.png'),
  cellphone: require('../../../assets/images/moneynote/categories/expense-phone.png'),
  'food-fork-drink': require('../../../assets/images/moneynote/categories/expense-food.png'),
  'glass-cocktail': require('../../../assets/images/moneynote/categories/expense-social.png'),
  'home-outline': require('../../../assets/images/moneynote/categories/expense-rent.png'),
  lipstick: require('../../../assets/images/moneynote/categories/expense-cosmetics.png'),
  'notebook-edit-outline': require('../../../assets/images/moneynote/categories/expense-education.png'),
  pill: require('../../../assets/images/moneynote/categories/expense-health.png'),
  train: require('../../../assets/images/moneynote/categories/expense-transport.png'),
  'tshirt-crew-outline': require('../../../assets/images/moneynote/categories/expense-clothes.png'),
  'water-pump': require('../../../assets/images/moneynote/categories/expense-electricity.png'),
};

const categoryIconDisplayScales: Record<string, number> = {
  'bottle-soda-outline': 1.42,
  'food-fork-drink': 1.44,
  'home-outline': 1.28,
  train: 1.28,
  'tshirt-crew-outline': 1.33,
};

export function MoneyNoteCategoryIcon({ icon, size = 44 }: MoneyNoteCategoryIconProps) {
  const usesFallbackSource = categoryIconSources[icon] === undefined;
  const source = categoryIconSources[icon] ?? categoryIconSources['bottle-soda-outline'];
  const displayScale =
    categoryIconDisplayScales[icon] ??
    (usesFallbackSource ? categoryIconDisplayScales['bottle-soda-outline'] : 1);
  const displaySize = size * displayScale;

  return (
    <View style={[styles.frame, { height: size, width: size }]}>
      <Image
        resizeMode="contain"
        source={source}
        style={[styles.icon, { height: displaySize, width: displaySize }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  icon: {
    flexShrink: 0,
  },
});
