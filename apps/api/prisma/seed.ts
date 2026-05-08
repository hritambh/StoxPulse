import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STOCKS = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    exchange: 'NSE',
    sector: 'Oil & Gas',
    aliases: ['Reliance', 'RIL', 'Mukesh Ambani company', 'Jio'],
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    exchange: 'NSE',
    sector: 'IT',
    aliases: ['TCS', 'Tata Consultancy', 'Tata Tech'],
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    exchange: 'NSE',
    sector: 'Banking',
    aliases: ['HDFC Bank', 'HDFC'],
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    exchange: 'NSE',
    sector: 'IT',
    aliases: ['Infosys', 'Infy', 'Narayana Murthy company'],
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    exchange: 'NSE',
    sector: 'Banking',
    aliases: ['ICICI Bank', 'ICICI'],
  },
  {
    symbol: 'HINDUNILVR',
    name: 'Hindustan Unilever Ltd',
    exchange: 'NSE',
    sector: 'FMCG',
    aliases: ['HUL', 'Hindustan Unilever'],
  },
  {
    symbol: 'SBIN',
    name: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Banking',
    aliases: ['SBI', 'State Bank'],
  },
  {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Ltd',
    exchange: 'NSE',
    sector: 'Telecom',
    aliases: ['Airtel', 'Bharti Airtel'],
  },
  {
    symbol: 'ITC',
    name: 'ITC Ltd',
    exchange: 'NSE',
    sector: 'FMCG',
    aliases: ['ITC'],
  },
  {
    symbol: 'KOTAKBANK',
    name: 'Kotak Mahindra Bank Ltd',
    exchange: 'NSE',
    sector: 'Banking',
    aliases: ['Kotak Bank', 'Kotak Mahindra'],
  },
  {
    symbol: 'WIPRO',
    name: 'Wipro Ltd',
    exchange: 'NSE',
    sector: 'IT',
    aliases: ['Wipro'],
  },
  {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Ltd',
    exchange: 'NSE',
    sector: 'Auto',
    aliases: ['Tata Motors', 'JLR', 'Jaguar Land Rover'],
  },
  {
    symbol: 'ADANIENT',
    name: 'Adani Enterprises Ltd',
    exchange: 'NSE',
    sector: 'Conglomerate',
    aliases: ['Adani', 'Adani Enterprises', 'Gautam Adani'],
  },
  {
    symbol: 'TATASTEEL',
    name: 'Tata Steel Ltd',
    exchange: 'NSE',
    sector: 'Metals',
    aliases: ['Tata Steel'],
  },
  {
    symbol: 'BAJFINANCE',
    name: 'Bajaj Finance Ltd',
    exchange: 'NSE',
    sector: 'Finance',
    aliases: ['Bajaj Finance'],
  },
];

async function main() {
  console.log('Seeding stocks...');

  for (const stock of STOCKS) {
    await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      create: stock,
      update: {
        name: stock.name,
        sector: stock.sector,
        aliases: stock.aliases,
      },
    });
    console.log(`  Upserted: ${stock.symbol}`);
  }

  console.log(`Seeded ${STOCKS.length} stocks`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
