"use client"

import { useState, useRef } from "react"
import useSWR, { mutate } from "swr"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Building2, Users, MapPin, Search, Clock, Plus, Upload, FileSpreadsheet, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import type { Venue, VenueType } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const venueTypeLabels: Record<VenueType, string> = {
  classroom: "Classroom",
  lab: "Lab",
  auditorium: "Auditorium",
  conference_room: "Conference Room",
  sports_facility: "Sports Facility",
  open_area: "Open Area",
}

export default function VenuesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [addOpen, setAddOpen] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [newVenue, setNewVenue] = useState({
    name: "",
    type: "",
    building: "",
    floor: "1",
    capacity: "30",
    description: "",
    amenities: "",
  })

  const { data } = useSWR("/api/venues", fetcher)
  const venues: Venue[] = data?.venues || []

  const handleAddVenue = async () => {
    if (!newVenue.name || !newVenue.type || !newVenue.building) {
      toast.error("Please fill in all required fields")
      return
    }
    setAddLoading(true)
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newVenue,
          amenities: newVenue.amenities.split(",").map((a) => a.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        toast.success("Venue added successfully")
        mutate("/api/venues")
        setAddOpen(false)
        setNewVenue({ name: "", type: "", building: "", floor: "1", capacity: "30", description: "", amenities: "" })
      } else {
        toast.error("Failed to add venue")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setAddLoading(false)
    }
  }

  const handleImportCSV = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file")
      return
    }
    setImportLoading(true)
    setImportResult(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      const res = await fetch("/api/venues/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult({ imported: data.imported, errors: data.errors })
        toast.success(`Successfully imported ${data.imported} venue(s)`)
        mutate("/api/venues")
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
      } else {
        setImportResult({ errors: data.errors || [data.error] })
        toast.error(data.error || "Import failed")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setImportLoading(false)
    }
  }

  const filteredVenues = venues.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.building.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || v.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div>
      <DashboardHeader
        title={isAdmin ? "Venue Management" : "Explore Venues"}
        description={isAdmin ? "Manage all campus venues" : "Browse and find the perfect campus space"}
      />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search venues by name or building..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Venue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="classroom">Classroom</SelectItem>
              <SelectItem value="lab">Lab</SelectItem>
              <SelectItem value="auditorium">Auditorium</SelectItem>
              <SelectItem value="conference_room">Conference Room</SelectItem>
              <SelectItem value="sports_facility">Sports Facility</SelectItem>
              <SelectItem value="open_area">Open Area</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Venue
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Add New Venue</DialogTitle>
                    <DialogDescription>Create a new venue for campus booking.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Venue Name</Label>
                      <Input
                        placeholder="e.g. Lecture Hall C"
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={newVenue.type} onValueChange={(v) => setNewVenue({ ...newVenue, type: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classroom">Classroom</SelectItem>
                            <SelectItem value="lab">Lab</SelectItem>
                            <SelectItem value="auditorium">Auditorium</SelectItem>
                            <SelectItem value="conference_room">Conference Room</SelectItem>
                            <SelectItem value="sports_facility">Sports Facility</SelectItem>
                            <SelectItem value="open_area">Open Area</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Building</Label>
                        <Input
                          placeholder="e.g. Main Building"
                          value={newVenue.building}
                          onChange={(e) => setNewVenue({ ...newVenue, building: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Floor</Label>
                        <Input
                          type="number"
                          value={newVenue.floor}
                          onChange={(e) => setNewVenue({ ...newVenue, floor: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input
                          type="number"
                          value={newVenue.capacity}
                          onChange={(e) => setNewVenue({ ...newVenue, capacity: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Amenities (comma separated)</Label>
                      <Input
                        placeholder="e.g. Projector, AC, Whiteboard"
                        value={newVenue.amenities}
                        onChange={(e) => setNewVenue({ ...newVenue, amenities: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief description..."
                        value={newVenue.description}
                        onChange={(e) => setNewVenue({ ...newVenue, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddVenue} disabled={addLoading}>
                      {addLoading ? "Adding..." : "Add Venue"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={importOpen} onOpenChange={(open) => {
                setImportOpen(open)
                if (!open) {
                  setSelectedFile(null)
                  setImportResult(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-heading flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      Import Venues from CSV
                    </DialogTitle>
                    <DialogDescription>
                      Upload a CSV file with columns: name, type, building, floor, capacity, amenities (semicolon-separated), description
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>CSV File</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          setSelectedFile(e.target.files?.[0] || null)
                          setImportResult(null)
                        }}
                      />
                    </div>
                    {selectedFile && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-sm text-foreground font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border border-dashed border-border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Expected CSV format:</p>
                      <code className="text-xs text-muted-foreground block">
                        name,type,building,floor,capacity,amenities,description
                      </code>
                      <code className="text-xs text-muted-foreground block">
                        Lecture Hall A,auditorium,Main Block,1,200,Projector;AC;Mic,Large hall
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        Valid types: classroom, lab, auditorium, conference_room, sports_facility, open_area
                      </p>
                    </div>
                    {importResult && (
                      <div className="space-y-2">
                        {importResult.imported && importResult.imported > 0 && (
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Successfully imported {importResult.imported} venue(s)
                            </p>
                          </div>
                        )}
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                            <p className="flex items-center gap-1.5 text-sm text-destructive font-medium mb-1">
                              <AlertCircle className="h-4 w-4" /> Errors:
                            </p>
                            <ul className="space-y-0.5">
                              {importResult.errors.map((err, i) => (
                                <li key={i} className="text-xs text-destructive/80">{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                    <Button
                      onClick={handleImportCSV}
                      disabled={importLoading || !selectedFile}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {importLoading ? "Importing..." : "Import"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
            <Building2 className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">No venues found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {venues.length === 0 ? "No venues available yet" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue) => (
              <Card key={venue._id} className="group transition-colors hover:border-primary/30">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="secondary">{venueTypeLabels[venue.type] || venue.type}</Badge>
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{venue.name}</h3>
                  {venue.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {venue.description}
                    </p>
                  )}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {venue.building}, Floor {venue.floor}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Capacity: {venue.capacity}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {venue.availability_hours.start} - {venue.availability_hours.end}
                    </div>
                  </div>
                  {venue.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {venue.amenities.slice(0, 4).map((a) => (
                        <Badge key={a} variant="outline" className="text-xs">
                          {a}
                        </Badge>
                      ))}
                      {venue.amenities.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{venue.amenities.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
