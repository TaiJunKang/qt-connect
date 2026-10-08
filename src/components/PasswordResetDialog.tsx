import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetDialogProps {
  open: boolean;
  onDone: () => void;
}

// 비밀번호 재설정 메일 링크로 들어왔을 때(PASSWORD_RECOVERY) 새 비밀번호를 받는 창
export default function PasswordResetDialog({ open, onDone }: PasswordResetDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "비밀번호는 6자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "비밀번호가 일치하지 않습니다.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "비밀번호가 변경되었습니다" });
    setPassword("");
    setConfirm("");
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onDone(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>새 비밀번호 설정</DialogTitle>
          <DialogDescription>앞으로 로그인할 때 사용할 비밀번호를 입력해주세요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="password" placeholder="새 비밀번호 (6자 이상)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          <Input type="password" placeholder="새 비밀번호 확인" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
