"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Users, Wrench, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface InviteEntry {
  name: string;
  email: string;
  jobTitle: string;
}

interface SetupWizardProps {
  companyId: string;
  companyName: string;
  inviterName: string;
  onComplete: () => void;
}

const EMPLOYEE_JOBS = ["営業", "設計", "現場監督", "大工", "事務", "社長"];
const CONTRACTOR_JOBS = ["大工", "電気工事", "水道工事", "塗装", "内装", "外構", "設備工事"];

export function SetupWizard({ companyId, companyName, inviterName, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(0);
  const [employees, setEmployees] = useState<InviteEntry[]>([{ name: "", email: "", jobTitle: "営業" }]);
  const [contractors, setContractors] = useState<InviteEntry[]>([{ name: "", email: "", jobTitle: "大工" }]);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const sendInvites = async (invites: InviteEntry[], role: string) => {
    const valid = invites.filter((i) => i.email.trim());
    if (valid.length === 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          companyName,
          inviterName,
          invites: valid.map((i) => ({ ...i, role })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const emailCount = data.results.filter((r: any) => r.emailSent).length;
        const linkCount = data.results.length - emailCount;
        setSentCount((prev) => prev + data.results.length);
        if (emailCount > 0) {
          toast.success(`${emailCount}名に招待メールを送信しました！`);
        }
        if (linkCount > 0) {
          toast.success(`${linkCount}名の招待リンクを作成しました`);
        }
      }
    } catch {
      toast.error("招待の送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const addEntry = (
    setList: React.Dispatch<React.SetStateAction<InviteEntry[]>>,
    defaultJob: string
  ) => {
    setList((prev) => [...prev, { name: "", email: "", jobTitle: defaultJob }]);
  };

  const removeEntry = (
    setList: React.Dispatch<React.SetStateAction<InviteEntry[]>>,
    index: number
  ) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (
    setList: React.Dispatch<React.SetStateAction<InviteEntry[]>>,
    index: number,
    field: keyof InviteEntry,
    value: string
  ) => {
    setList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  function InviteForm({
    entries,
    setEntries,
    jobs,
    defaultJob,
    accentColor,
  }: {
    entries: InviteEntry[];
    setEntries: React.Dispatch<React.SetStateAction<InviteEntry[]>>;
    jobs: string[];
    defaultJob: string;
    accentColor: string;
  }) {
    return (
      <>
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
          {entries.map((e, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-2 items-start"
            >
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="名前"
                    value={e.name}
                    onChange={(ev) => updateEntry(setEntries, i, "name", ev.target.value)}
                    className="h-10"
                  />
                  <Select
                    value={e.jobTitle}
                    onValueChange={(v) => updateEntry(setEntries, i, "jobTitle", v)}
                  >
                    <SelectTrigger className="h-10 w-28 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j} value={j}>
                          {j}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="email"
                  placeholder="メールアドレス"
                  value={e.email}
                  onChange={(ev) => updateEntry(setEntries, i, "email", ev.target.value)}
                  className="h-10"
                />
              </div>
              {entries.length > 1 && (
                <button
                  onClick={() => removeEntry(setEntries, i)}
                  className="mt-2 text-gray-300 hover:text-gray-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className={`mt-3 ${accentColor}`}
          onClick={() => addEntry(setEntries, defaultJob)}
        >
          <Plus className="w-4 h-4 mr-1" /> もう1人追加
        </Button>
      </>
    );
  }

  const STEPS = [
    // Step 0: Welcome
    {
      content: (
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-7xl mb-6"
          >
            👋
          </motion.div>
          <h2 className="text-2xl font-bold text-[#1B1B27] mb-3">チームを作ろう！</h2>
          <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
            キャッチボールはチームで使うともっと便利。
            <br />
            従業員や外注先を招待して始めましょう！
          </p>
        </div>
      ),
      nextLabel: "始める",
      onNext: () => setStep(1),
    },
    // Step 1: Employees
    {
      content: (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1B1B27]">まず、従業員を招待しよう</h2>
              <p className="text-xs text-gray-400">招待メールが届きます</p>
            </div>
          </div>
          <InviteForm
            entries={employees}
            setEntries={setEmployees}
            jobs={EMPLOYEE_JOBS}
            defaultJob="営業"
            accentColor="text-blue-500 hover:text-blue-600"
          />
        </div>
      ),
      nextLabel: sending ? "送信中..." : "招待して次へ",
      onNext: async () => {
        await sendInvites(employees, "member");
        setStep(2);
      },
      skipLabel: "スキップ",
      onSkip: () => setStep(2),
    },
    // Step 2: Contractors
    {
      content: (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1B1B27]">次に、外注先を招待しよう</h2>
              <p className="text-xs text-gray-400">協力会社や職人さんを追加できます</p>
            </div>
          </div>
          <InviteForm
            entries={contractors}
            setEntries={setContractors}
            jobs={CONTRACTOR_JOBS}
            defaultJob="大工"
            accentColor="text-orange-500 hover:text-orange-600"
          />
        </div>
      ),
      nextLabel: sending ? "送信中..." : "招待して次へ",
      onNext: async () => {
        await sendInvites(contractors, "external");
        setStep(3);
      },
      skipLabel: "スキップ",
      onSkip: () => setStep(3),
    },
    // Step 3: Done
    {
      content: (
        <div className="text-center py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-7xl mb-6"
          >
            🎉
          </motion.div>
          <h2 className="text-2xl font-bold text-[#1B1B27] mb-3">準備完了！</h2>
          <p className="text-gray-500 leading-relaxed">
            {sentCount > 0 && <>{sentCount}名に招待を送信しました。<br /></>}
            さっそく最初の案件を作成してみましょう！
          </p>
        </div>
      ),
      nextLabel: "ダッシュボードへ",
      onNext: () => onComplete(),
    },
  ];

  const current = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <motion.div
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            className="h-full bg-teal-500"
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6">
          {/* Step dots */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? "bg-teal-500 w-6"
                    : i < step
                    ? "bg-teal-200 w-1.5"
                    : "bg-gray-200 w-1.5"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              {current.content}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-6 space-y-2">
            <Button
              className="w-full h-12 bg-teal-500 hover:bg-teal-600 text-base font-bold"
              disabled={sending}
              onClick={current.onNext}
            >
              {current.nextLabel}
              {!sending && step < STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
            {"skipLabel" in current && current.skipLabel && (
              <button
                onClick={(current as any).onSkip}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
              >
                {current.skipLabel}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
