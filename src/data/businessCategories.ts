import { BusinessCategory } from '../types/business';

export const businessCategories: BusinessCategory[] = [
  {
    id: 'supermarket',
    name: 'Supermarket/Grocery Store',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 2,
    icon: '🛒',
    description: 'Food and household essentials retail'
  },
  {
    id: 'laundry',
    name: 'Laundry/Dry Cleaning',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 1,
    icon: '👕',
    description: 'Clothing cleaning and care services'
  },
  {
    id: 'cafe',
    name: 'Café/Restaurant',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 1,
    icon: '☕',
    description: 'Food and beverage service'
  },
  {
    id: 'pharmacy',
    name: 'Pharmacy',
    minRadius: 0.3,
    maxRadius: 10,
    defaultRadius: 1.5,
    icon: '💊',
    description: 'Healthcare and medication retail'
  },
  {
    id: 'clothing',
    name: 'Clothing Store',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 3,
    icon: '👗',
    description: 'Fashion and apparel retail'
  },
  {
    id: 'hardware',
    name: 'Hardware Store',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 5,
    icon: '🔧',
    description: 'Tools and home improvement supplies'
  },
  {
    id: 'beauty',
    name: 'Beauty Salon',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 2,
    icon: '💇‍♀️',
    description: 'Personal care and beauty services'
  },
  {
    id: 'bank',
    name: 'Bank/Financial Services',
    minRadius: 0.5,
    maxRadius: 10,
    defaultRadius: 3,
    icon: '🏦',
    description: 'Financial and banking services'
  }
]; 