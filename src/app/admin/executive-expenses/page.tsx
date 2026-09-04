import { Metadata } from 'next';
import { ExecutiveExpensesClient } from './executive-expenses-client';

export const metadata: Metadata = {
  title: 'Executive Expenses & Gross Profit | Super Admin | SSPACIA',
  description: 'Private Super Admin record keeping for expenses and live Gross Profit percentage analysis.'
};

export default function ExecutiveExpensesPage() {
  return <ExecutiveExpensesClient />;
}
