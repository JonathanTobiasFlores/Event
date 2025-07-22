"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getProfile, updateProfile, Profile } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Palette, Check } from "lucide-react";

const PRESET_COLORS = [
  "#8EC3B0", // mint-3
  "#9ED5C5", // mint-2
  "#E94B3C", // Coral
  "#F4A261", // Sandy
  "#2A9D8F", // Teal
  "#264653", // Deep blue
  "#E76F51", // Terracotta
  "#F72585", // Pink
  "#7209B7", // Purple
  "#3A0CA3", // Deep purple
  "#4361EE", // Blue
  "#4CC9F0", // Sky blue
];

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

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
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
      setMessage("Color updated successfully!");
      setTimeout(() => setMessage(null), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-mint-2 border-t-mint-3 mx-auto"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md mx-auto bg-mint-1 border-mint-2/30">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-mint-3" />
            Settings
          </DialogTitle>
          <DialogDescription>Customize your drawing experience</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center p-4 bg-mint-0 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Signed in as</p>
            <p className="font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="color" className="block mb-3 font-medium text-base">
                Your Stroke Color
              </label>
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => handleColorChange(presetColor)}
                      className={`
                        w-full aspect-square rounded-xl border-2 transition-all transform hover:scale-110
                        ${color === presetColor ? 'border-mint-3 shadow-lg scale-110' : 'border-mint-2/30 hover:border-mint-2'}
                      `}
                      style={{ backgroundColor: presetColor }}
                    >
                      {color === presetColor && (
                        <Check className="w-4 h-4 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-16 h-10 p-0 border-2 border-mint-2 rounded-lg cursor-pointer"
                    style={{ background: color }}
                  />
                  <Input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="flex-1 bg-mint-0 border-mint-2/50 focus:ring-mint-2"
                    placeholder="#000000"
                  />
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-mint-2 shadow-inner"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => router.push('/')} className="border-mint-2/50 hover:bg-mint-0">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-mint-3 hover:bg-mint-3/90 text-white shadow-lg hover:shadow-xl transition-all"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            
            {message && (
              <div className={`text-center p-3 rounded-lg animate-fade-in-up ${
                message.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-mint-2/30 text-mint-3'
              }`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}