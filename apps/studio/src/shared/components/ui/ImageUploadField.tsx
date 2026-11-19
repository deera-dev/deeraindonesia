import { toast } from "@deera/shared/features/toast/hooks";
import { friendlyMediaErrorMessage, uploadMedia } from "@deera/shared/lib/mediaUpload";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { Label } from "./Field";

interface ImageUploadFieldProps {
  label: string;
  folder: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
  required?: boolean;
}

export function ImageUploadField({
  label,
  folder,
  value,
  onChange,
  aspect = "aspect-square",
  required,
}: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadMedia(file, { kind: "image" });
      onChange(result.url);
    } catch (err) {
      toast.error(friendlyMediaErrorMessage(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <Label>
        {label}
        {required && " *"}
      </Label>
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface-2",
          aspect,
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-text-faint" />
        ) : (
          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-text-faint">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Upload</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-folder={folder}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    </div>
  );
}
