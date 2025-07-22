"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getProfile, updateProfile, Profile } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [color, setColor] = useState<string>("#000000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await getCurrentUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUser(userData.user);
      const { data: profileData } = await getProfile(userData.user.id);
      setProfile(profileData);
      setColor(profileData?.color || "#000000");
      setLoading(false);
    }
    load();
  }, [router]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);
    const { error } = await updateProfile(user.id, { color });
    if (error) {
      setMessage("Failed to update color: " + error.message);
    } else {
      setMessage("Color updated!");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md mx-auto p-8">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Change your stroke color for collaborative drawing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="color" className="block mb-2 font-medium">Stroke Color</label>
            <Input
              id="color"
              type="color"
              value={color}
              onChange={handleColorChange}
              className="w-16 h-10 p-0 border-none bg-transparent cursor-pointer"
              style={{ background: "none" }}
            />
            <span className="ml-4 align-middle">{color}</span>
          </div>
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => router.push('/')}>Close</Button>
            </DialogClose>
            <Button
              type="submit"
              className="px-4 py-2"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {message && <div className="text-green-600">{message}</div>}
        </form>
      </DialogContent>
    </Dialog>
  );
} 