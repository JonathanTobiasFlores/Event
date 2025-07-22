"use client";
import { useEffect, useState } from "react";
import { getCurrentUser, createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export default function UserMenu() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser().then(({ data }) => setUser(data.user));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar_url || undefined} alt={user.email} />
          </Avatar>
          <span className="hidden sm:inline">{user.email}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-2">
        <div className="flex flex-col items-start gap-2">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 