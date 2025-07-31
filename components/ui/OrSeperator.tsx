export default function OrSeparator() {
   return (
      <div className="flex items-center w-full">
         <hr className="flex-grow border-t border-foreground" />
         <span className="mx-2 text-foreground">or</span>
         <hr className="flex-grow border-t border-foreground" />
      </div>
   )
}
