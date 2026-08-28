"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ZivaLogo } from "@/components/domain/ziva-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { updateOrganizationProfile, type Organization } from "@/lib/actions/organization";

const schema = z.object({
  name: z.string().min(1, "Organization name is required"),
  motto: z.string().optional(),
  established_year: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  whatsapp: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function OrganizationPanel({ organization }: { organization: Organization | null }) {
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization?.name ?? "ZIVA Online & Special Classes",
      motto: organization?.motto ?? "Excellence Our Hallmark",
      established_year: organization?.established_year?.toString() ?? "2023",
      phone: organization?.phone ?? "",
      email: organization?.email ?? "",
      facebook: organization?.social_media.facebook ?? "",
      instagram: organization?.social_media.instagram ?? "",
      tiktok: organization?.social_media.tiktok ?? "",
      whatsapp: organization?.social_media.whatsapp ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setStatus(null);
    setSubmitting(true);
    const result = await updateOrganizationProfile({
      name: values.name,
      motto: values.motto ?? "",
      established_year: values.established_year ? parseInt(values.established_year, 10) : null,
      phone: values.phone ?? "",
      email: values.email ?? "",
      facebook: values.facebook ?? "",
      instagram: values.instagram ?? "",
      tiktok: values.tiktok ?? "",
      whatsapp: values.whatsapp ?? "",
    });
    setSubmitting(false);
    setStatus(
      result.success
        ? { type: "success", message: "Organization profile updated." }
        : { type: "error", message: result.error }
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="h-fit">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <ZivaLogo size={80} />
          <p className="mt-3 text-xs text-ink-500">
            The official logo is fixed and used everywhere branding appears. It cannot be changed
            here — replacing it requires updating <code>public/images/ziva-logo-original.jpg</code>{" "}
            directly.
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent>
          {status && (
            <Alert variant={status.type} className="mb-4">
              {status.message}
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Organization name</Label>
                <Input id="name" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && <p className="mt-1 text-sm text-error">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="motto">Motto</Label>
                <Input id="motto" {...register("motto")} />
              </div>
              <div>
                <Label htmlFor="established_year">Established year</Label>
                <Input id="established_year" type="number" {...register("established_year")} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} aria-invalid={!!errors.email} />
                {errors.email && <p className="mt-1 text-sm text-error">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-navy-900">Social media handles</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input id="facebook" placeholder="@zivaclasses" {...register("facebook")} />
                </div>
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" placeholder="@zivaclasses" {...register("instagram")} />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input id="tiktok" placeholder="@zivaclasses" {...register("tiktok")} />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input id="whatsapp" placeholder="+233 ..." {...register("whatsapp")} />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
