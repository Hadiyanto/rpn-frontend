export default function PageSkeleton() {
    return (
        <div className="bg-brand-yellow font-display min-h-screen p-5 space-y-3">
            <div className="animate-pulse space-y-3">
                <div className="h-8 bg-white/50 rounded-xl w-1/2" />
                <div className="h-16 bg-white/50 rounded-2xl" />
                <div className="h-16 bg-white/50 rounded-2xl" />
                <div className="h-16 bg-white/50 rounded-2xl" />
            </div>
        </div>
    );
}
