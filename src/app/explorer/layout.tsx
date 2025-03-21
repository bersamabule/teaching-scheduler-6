import Layout from '@/components/Layout';

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
} 