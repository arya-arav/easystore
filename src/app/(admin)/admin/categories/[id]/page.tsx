import { redirect } from 'next/navigation';

export default async function EditCategoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  redirect(`/admin/categories?edit=${encodeURIComponent(id)}`);
}
