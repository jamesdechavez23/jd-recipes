"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/shadcn/form"
import { Input } from "@/components/ui/shadcn/input"
import { useEffect, useRef, useState } from "react"
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile"
import { Button } from "@/components/ui/shadcn/button"

const registerFormSchema = z
   .object({
      email: z.email("Invalid email address").min(1).max(100),
      password: z.string().min(8, "Password must be at least 8 characters long").max(20, "Password must be at most 20 characters long"),
      confirmPassword: z.string(),
      captchaToken: z.string().min(1, "Captcha token is required")
   })
   .refine(data => data.password === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"]
   })

export type RegisterFormValues = z.infer<typeof registerFormSchema>

interface RegisterFormProps {
   registerUser({ email, password, captchaToken }: RegisterFormValues): Promise<
      | {
           success: boolean
           error: string
        }
      | {
           success: boolean
           error: null
        }
   >
}

export default function RegisterForm({ registerUser }: RegisterFormProps) {
   const turnstileRef = useRef<TurnstileInstance>(null)

   const [success, setSuccess] = useState(false)
   const [error, setError] = useState("")
   const [isDark, setIsDark] = useState(false)

   useEffect(() => {
      const storedTheme = localStorage.getItem("theme")
      if (storedTheme === "dark") {
         setIsDark(true)
      }
   }, [])

   useEffect(() => {
      const updateTheme = () => {
         setIsDark(localStorage.getItem("theme") === "dark")
      }
      window.addEventListener("theme-changed", updateTheme)
      updateTheme()
      return () => window.removeEventListener("theme-changed", updateTheme)
   }, [])

   const form = useForm<RegisterFormValues>({
      resolver: zodResolver(registerFormSchema),
      defaultValues: {
         email: "",
         password: "",
         confirmPassword: "",
         captchaToken: ""
      }
   })

   useEffect(() => {
      console.log("Form errors:", form.formState.errors)
   }, [form.formState.errors])

   async function onSubmit(values: RegisterFormValues) {
      setError("")
      setSuccess(false)
      const { success, error } = await registerUser(values)

      if (error || !success) {
         setError(error || "An unknown error occurred")
         setSuccess(false)
         form.setValue("captchaToken", "")
         turnstileRef.current?.reset()
      }
      setSuccess(true)
      setError("")
   }
   return (
      <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
               control={form.control}
               name="email"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>Email</FormLabel>
                     <FormControl>
                        <Input placeholder="Enter your email" {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <FormField
               control={form.control}
               name="password"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>Password</FormLabel>
                     <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <FormField
               control={form.control}
               name="confirmPassword"
               render={({ field }) => (
                  <FormItem>
                     <FormLabel>Confirm Password</FormLabel>
                     <FormControl>
                        <Input type="password" placeholder="Confirm your password" {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )}
            />
            <Turnstile
               ref={turnstileRef}
               siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
               onSuccess={token => form.setValue("captchaToken", token)}
               onError={error => form.setError("captchaToken", { message: error })}
               options={{
                  theme: isDark ? "dark" : "light"
               }}
            />
            {form.formState.errors.captchaToken && (
               <FormMessage className="text-destructive">{form.formState.errors.captchaToken.message}</FormMessage>
            )}
            <Button type="submit" className="w-full">
               Register
            </Button>
            {error && <FormMessage className="text-destructive">{error}</FormMessage>}
            {success && <FormMessage className="text-primary">Registration successful! Please check your email to verify your account.</FormMessage>}
         </form>
      </Form>
   )
}
