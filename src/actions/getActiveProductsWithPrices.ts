import prisma from '@/lib/prisma';
import type { ProductWithPrice } from '@/types';

const getActiveProductsWithPrices = async (): Promise<ProductWithPrice[]> => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: {
      prices: {
        where: { active: true },
        orderBy: { unitAmount: 'asc' },
      },
    },
  });

  return products.map(p => ({
    id: p.id,
    active: p.active ?? true,
    name: p.name ?? undefined,
    description: p.description ?? undefined,
    image: p.image ?? undefined,
    metadata: p.metadata as Record<string, any> | undefined,
    prices: p.prices.map(price => ({
      id: price.id,
      product_id: price.productId ?? '',
      active: price.active ?? true,
      description: price.description ?? undefined,
      unit_amount: price.unitAmount ?? undefined,
      currency: price.currency ?? undefined,
      type: price.type as string | undefined,
      interval: price.interval as string | undefined,
      interval_count: price.intervalCount ?? undefined,
      trial_period_days: price.trialPeriodDays,
      metadata: price.metadata as Record<string, any> | undefined,
      products: undefined,
    })),
  }));
};

export default getActiveProductsWithPrices;
