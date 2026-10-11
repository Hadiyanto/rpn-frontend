import { redirect } from 'next/navigation';

// Old WhatsApp links (/bukti-transfer/<public_token>) → the order status page. Links with a numeric
// order id are no longer served: /status only accepts the unguessable token.
export default async function BuktiTransferRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/status/${encodeURIComponent(id)}`);
}
