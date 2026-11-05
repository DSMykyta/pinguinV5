export const manifest = Object.freeze({
  id: 'overview',
  title: 'Огляд',
  route: '/',
  type: 'overview',
  navigation: {
    icon: 'house',
    order: 0,
  },
  load: () => import('./index.js'),
});
