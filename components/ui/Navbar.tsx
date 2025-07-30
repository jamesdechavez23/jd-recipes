import React from "react"
import { User as UserIcon, Menu } from "lucide-react"
import { Button } from "./shadcn/button"
import {
   NavigationMenu,
   NavigationMenuList,
   NavigationMenuItem,
   NavigationMenuTrigger,
   NavigationMenuContent,
   NavigationMenuLink
} from "./shadcn/navigation-menu"
import { User } from "@/app/layout"

type NavbarProps = {
   user: User | null
}

export function Navbar({ user }: NavbarProps) {
   return (
      <nav className="w-full flex items-center px-4 py-2 bg-background">
         {user ? (
            <NavigationMenu>
               <NavigationMenuList>
                  <NavigationMenuItem>
                     <NavigationMenuTrigger>
                        <Button variant="ghost" size="icon" aria-label="Menu">
                           <Menu />
                        </Button>
                     </NavigationMenuTrigger>
                     <NavigationMenuContent>
                        <div className="flex flex-col min-w-[160px]">
                           <NavigationMenuLink href="#">Profile</NavigationMenuLink>
                           <NavigationMenuLink href="#">Settings</NavigationMenuLink>
                           <NavigationMenuLink href="#">Logout</NavigationMenuLink>
                        </div>
                     </NavigationMenuContent>
                  </NavigationMenuItem>
               </NavigationMenuList>
            </NavigationMenu>
         ) : (
            <Button variant="ghost" size="icon" aria-label="User">
               <UserIcon />
            </Button>
         )}
      </nav>
   )
}

export default Navbar
