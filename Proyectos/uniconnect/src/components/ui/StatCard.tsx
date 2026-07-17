type StatCardProps = {
  title: string;
  value: string;
  icon: React.ReactNode;
};

export default function StatCard({
  title,
  value,
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-md transition hover:shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-6">
      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-primary">
            {value}
          </h2>

        </div>

        <div className="text-4xl text-primary">
          {icon}
        </div>

      </div>
    </div>
  );
}
