"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  Building2,
  CalendarDays,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react"

function Navbar() {
  const { user } = useAuth()

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold text-foreground">SpaceOptiX</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            How It Works
          </a>
          <a href="#roles" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            For Everyone
          </a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(215_90%_42%/0.08),transparent_60%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-accent" />
            Smart Campus Venue Booking
          </div>
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
            Book Campus Spaces with Confidence
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
            SpaceOptiX streamlines venue booking for your entire campus. From classrooms to
            auditoriums, manage reservations with real-time availability, smart approvals, and
            conflict-free scheduling.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2 px-8" asChild>
              <Link href="/register">
                Start Booking
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Venues Managed", value: "120+", icon: Building2 },
            { label: "Active Users", value: "5,000+", icon: Users },
            { label: "Bookings Processed", value: "25K+", icon: CalendarDays },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const features = [
    {
      icon: CalendarDays,
      title: "Real-Time Availability",
      description:
        "See live availability for every venue across campus. No double-bookings, no surprises.",
    },
    {
      icon: ShieldCheck,
      title: "Smart Approval Workflow",
      description:
        "Multi-level approval system with auto-approve for professors and escalation paths for complex requests.",
    },
    {
      icon: Clock,
      title: "Conflict Detection",
      description:
        "Intelligent scheduling that prevents overlapping bookings and suggests alternative time slots.",
    },
    {
      icon: Building2,
      title: "Venue Explorer",
      description:
        "Browse venues by type, capacity, amenities, and building. Find the perfect space for any event.",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description:
        "Tailored experiences for students, professors, and administrators with appropriate permissions.",
    },
    {
      icon: Zap,
      title: "Instant Notifications",
      description:
        "Get notified about booking approvals, rejections, and upcoming reservations in real time.",
    },
  ]

  return (
    <section id="features" className="border-t border-border bg-card py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
            Everything You Need to Manage Campus Spaces
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Built for the complexity of campus scheduling with simplicity that everyone can use.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Browse & Select",
      description: "Explore available venues with filters for type, capacity, and amenities.",
    },
    {
      step: "02",
      title: "Choose Your Slot",
      description: "Pick a date and time with real-time availability and conflict checking.",
    },
    {
      step: "03",
      title: "Submit & Approve",
      description: "Submit your request and get automatic or professor-approved confirmations.",
    },
    {
      step: "04",
      title: "Show Up & Use",
      description: "Receive confirmation and directions. Your space is guaranteed and ready.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
            Booking Made Simple
          </h2>
          <p className="mt-4 text-muted-foreground">
            Four steps to secure your perfect campus venue.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="relative rounded-xl border border-border bg-card p-6">
              <span className="font-heading text-4xl font-bold text-primary/15">{item.step}</span>
              <h3 className="mt-2 font-heading text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function RolesSection() {
  const roles = [
    {
      title: "Students",
      description: "Easily find and book classrooms, labs, and study spaces for your group projects and events.",
      features: [
        "Browse available venues with filters",
        "Book spaces in just a few clicks",
        "Track your booking status in real time",
        "View booking history and receipts",
      ],
    },
    {
      title: "Professors",
      description: "Approve student requests and book spaces for lectures, workshops, and seminars with priority access.",
      features: [
        "Auto-approved bookings for quick scheduling",
        "Review and approve student requests",
        "Priority access to premium venues",
        "Department-level booking insights",
      ],
    },
    {
      title: "Administrators",
      description: "Full control over venues, users, and the booking lifecycle with comprehensive audit trails.",
      features: [
        "Manage all venues and their availability",
        "Oversee all bookings and approvals",
        "User management and role assignment",
        "Detailed audit logs and analytics",
      ],
    },
  ]

  return (
    <section id="roles" className="border-t border-border bg-card py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground md:text-4xl text-balance">
            Designed for Every Role on Campus
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Each user gets a tailored experience built for their specific needs.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {roles.map((role) => (
            <div key={role.title} className="rounded-xl border border-border bg-background p-6">
              <h3 className="font-heading text-xl font-bold text-foreground">{role.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
              <ul className="mt-5 space-y-3">
                {role.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-foreground py-10 text-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-bold">SpaceOptiX</span>
        </div>
        <p className="text-sm text-background/60">
          Built for smarter campus space management.
        </p>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <Footer />
    </div>
  )
}
