import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

type MoneyNoteCategoryIconProps = {
  icon: string;
  size?: number;
};

const categoryIconSources: Record<string, ImageSourcePropType> = {
  'bottle-soda-outline': require('../../../assets/images/moneynote/categories/expense-daily.png'),
  cellphone: require('../../../assets/images/moneynote/categories/expense-phone.png'),
  'chart-line': require('../../../assets/images/moneynote/categories/income-investment.png'),
  'food-fork-drink': require('../../../assets/images/moneynote/categories/expense-food.png'),
  'glass-cocktail': require('../../../assets/images/moneynote/categories/expense-social.png'),
  'gift-outline': require('../../../assets/images/moneynote/categories/income-bonus.png'),
  'hand-coin-outline': require('../../../assets/images/moneynote/categories/income-temporary.png'),
  'home-outline': require('../../../assets/images/moneynote/categories/expense-rent.png'),
  lipstick: require('../../../assets/images/moneynote/categories/expense-cosmetics.png'),
  'notebook-edit-outline': require('../../../assets/images/moneynote/categories/expense-education.png'),
  'piggy-bank-outline': require('../../../assets/images/moneynote/categories/income-allowance.png'),
  pill: require('../../../assets/images/moneynote/categories/expense-health.png'),
  'sack-percent': require('../../../assets/images/moneynote/categories/income-extra.png'),
  train: require('../../../assets/images/moneynote/categories/expense-transport.png'),
  'tshirt-crew-outline': require('../../../assets/images/moneynote/categories/expense-clothes.png'),
  'wallet-outline': require('../../../assets/images/moneynote/categories/income-salary.png'),
  'water-pump': require('../../../assets/images/moneynote/categories/expense-electricity.png'),
};

const categoryIconDisplayScales: Record<string, number> = {
  'bottle-soda-outline': 1.42,
  'food-fork-drink': 1.44,
  'gift-outline': 1.08,
  'hand-coin-outline': 1.12,
  'home-outline': 1.28,
  'piggy-bank-outline': 1.04,
  'sack-percent': 1.12,
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
