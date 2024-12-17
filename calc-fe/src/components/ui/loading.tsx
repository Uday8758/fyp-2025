import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function ButtonLoading() {
  return (
    <Button className="bg-green-400 z-20">
      <Loader2 className="animate-spin" />
      Please wait
    </Button>
  )
}
