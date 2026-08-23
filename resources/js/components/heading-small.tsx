export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header className="flex flex-col gap-1">
            <h3 className="text-base font-medium">{title}</h3>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
    );
}
