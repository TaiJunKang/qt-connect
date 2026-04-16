import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface WeeklyPlanItem {
  date: string;       // MM-DD
  title: string;
  reference: string;
  text: string;
  commentary: string;
}

interface WeeklyPlanCardProps {
  index: number;
  plan: WeeklyPlanItem;
  onChange: (updated: WeeklyPlanItem) => void;
}

export default function WeeklyPlanCard({ index, plan, onChange }: WeeklyPlanCardProps) {
  const update = (field: keyof WeeklyPlanItem, value: string) =>
    onChange({ ...plan, [field]: value });

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="py-4 px-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/5">
            Day {index + 1}
          </Badge>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {plan.date}
          </span>
          <span className="text-xs text-muted-foreground">{plan.reference}</span>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">제목</Label>
          <Input
            value={plan.title}
            onChange={(e) => update("title", e.target.value)}
            className="text-sm h-9"
          />
        </div>

        {/* Bible text */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">성경 본문</Label>
          <Textarea
            value={plan.text}
            onChange={(e) => update("text", e.target.value)}
            className="min-h-[100px] resize-none text-sm leading-7 font-scripture"
            placeholder="bible.txt에서 자동 추출됩니다"
          />
        </div>

        {/* Commentary */}
        <div className="space-y-1">
          <Label className="text-xs font-medium text-muted-foreground">묵상 길잡이 해설</Label>
          <Textarea
            value={plan.commentary}
            onChange={(e) => update("commentary", e.target.value)}
            className="min-h-[90px] resize-none text-sm leading-7"
          />
        </div>
      </CardContent>
    </Card>
  );
}
