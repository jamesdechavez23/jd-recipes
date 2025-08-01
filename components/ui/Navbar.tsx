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
import Link from "next/link"
import { JwtPayload } from "@supabase/supabase-js"

type NavbarProps = {
   user: JwtPayload | null
}

export function Navbar({ user }: NavbarProps) {
   return (
      <>
         {user ? (
            <nav className="w-full flex items-center py-2 bg-background">
               <NavigationMenu>
                  <NavigationMenuList>
                     <NavigationMenuItem>
                        <NavigationMenuTrigger>
                           <Button variant="ghost" size="icon" aria-label="Menu" asChild>
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
            </nav>
         ) : (
            <nav className="w-full flex items-center px-4 py-2 bg-background">
               <Link className="-ml-2" href="/login" passHref>
                  <Button variant="ghost" aria-label="User" asChild>
                     <span className="flex items-center gap-2">
                        <UserIcon />
                        <span>Login</span>
                     </span>
                  </Button>
               </Link>
            </nav>
         )}
      </>
   )
}

export default Navbar
