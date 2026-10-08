import { Heart, HandHeart, Users } from 'lucide-react';

const icons = [Heart, HandHeart, Users];

export function WelcomeReminders({ items }: { items: { title: string; description: string }[] }) {
  return (
    <ul className="grid gap-5">
      {items.map(({ title, description }, index) => {
        const Icon = icons[index];
        return (
          <li key={title} className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-teal">
              <Icon size={19} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
