import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMemories, useMemoryMutations } from "@/hooks/use-memories";
import { allowedCategories } from "@/lib/copies";
import type { AllowedCategory } from "@/types/memory";

function MemoriesPage() {
  const { entries, loading } = useMemories();
  const { addEntry, deleteEntry } = useMemoryMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<AllowedCategory>(allowedCategories[0]);
  const [tags, setTags] = useState("");

  const handleCreate = async () => {
    if (!answer.trim()) {
      toast.error("Answer is required");
      return;
    }

    try {
      await addEntry.mutateAsync({
        question: question.trim() || undefined,
        answer: answer.trim(),
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        confidence: 0.9,
      });
      toast.success("Memory added");
      setDialogOpen(false);
      setQuestion("");
      setAnswer("");
      setTags("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add memory";
      toast.error(message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success("Memory deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete memory";
      toast.error(message);
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Knowledge base</p>
          <h1 className="text-2xl font-semibold">Memories</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add memory
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add memory</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="question">Question (optional)</Label>
                <Input
                  id="question"
                  placeholder="What is your email?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  placeholder="you@example.com"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={(val) => setCategory(val as AllowedCategory)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Choose category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="work, contact"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={addEntry.isPending}>
                {addEntry.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Question</TableHead>
              <TableHead>Answer</TableHead>
              <TableHead className="w-[10%]">Category</TableHead>
              <TableHead className="w-[10%]">Tags</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No memories yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {entry.question || "—"}
                  </TableCell>
                  <TableCell className="align-top font-medium">
                    {entry.answer}
                  </TableCell>
                  <TableCell className="align-top capitalize text-sm text-muted-foreground">
                    {entry.category}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {entry.tags.join(", ")}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
});
