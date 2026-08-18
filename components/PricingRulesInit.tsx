'use client';

import { useEffect } from 'react';
import { initPricingRules } from '@/lib/priceCalc';

export default function PricingRulesInit() {
  useEffect(() => {
    initPricingRules();
  }, []);
  return null;
}
