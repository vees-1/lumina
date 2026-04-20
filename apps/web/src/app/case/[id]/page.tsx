export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Case {id}</h1>
      <p className="text-muted-foreground mt-1">Results will appear here.</p>
    </main>
  );
}
