import { Link } from "react-router-dom";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger, MenubarLabel, MenubarRadioGroup, MenubarRadioItem } from "@/components/ui/8bit/menubar";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";

const Header = () => {
  const { theme = "system", setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/60 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2" aria-label="VisionAIry home">
          <span className="font-display text-base md:text-lg">VisionAIry</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Menubar className="w-fit">
            <MenubarMenu>
              <MenubarTrigger>Account</MenubarTrigger>
              <MenubarContent className="z-[100] bg-popover">
                <MenubarItem asChild>
                  <Link to="/login" aria-label="Log in to VisionAIry">Log in</Link>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem asChild>
                  <Link to="/signup" aria-label="Sign up for VisionAIry">Sign up</Link>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarLabel>Theme</MenubarLabel>
                <MenubarRadioGroup value={theme ?? "system"} onValueChange={(v) => setTheme(v as any)}>
                  <MenubarRadioItem value="light">
                    <Sun className="mr-2 h-4 w-4" /> Light
                  </MenubarRadioItem>
                  <MenubarRadioItem value="dark">
                    <Moon className="mr-2 h-4 w-4" /> Dark
                  </MenubarRadioItem>
                  <MenubarRadioItem value="system">
                    <Monitor className="mr-2 h-4 w-4" /> System
                  </MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </nav>
      </div>
    </header>
  );
};

export default Header;
