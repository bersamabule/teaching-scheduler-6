import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-indigo-600 mb-8">
            Teaching Scheduler 6
          </h1>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Generate Teaching Agendas with Ease
              </h2>
              <p className="text-gray-500 mb-6">
                Teaching Scheduler 6 helps you generate teaching agendas for any teacher on any date.
                Simply select a teacher and date to get a comprehensive agenda pulled from your Supabase database.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/explorer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Explore Database
                </Link>
                <Link
                  href="/schedule"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Generate Schedule
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
