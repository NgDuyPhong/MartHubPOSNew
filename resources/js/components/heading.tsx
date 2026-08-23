export default function Heading({ title, description }: { title: string; description?: string }) {
    return (
        <header className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
    );
}
