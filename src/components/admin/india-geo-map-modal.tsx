"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Download, Filter, Sparkles, RefreshCw, Search, MapPin } from "lucide-react";
import { toast } from "sonner";

interface CityGeoData {
  city: string;
  state: string;
  lat: number;
  lng: number;
  visitors: number;
  chatLeads: number;
  convertedLeads: number;
  loggedOutVisitors: number;
  unregisteredVisitors: number;
}

interface GeoAnalyticsResponse {
  filter: string;
  summary: {
    totalVisitors: number;
    totalChatLeads: number;
    totalConverted: number;
    totalCities: number;
    avgConversionRate: string;
  };
  cities: CityGeoData[];
}

export function IndiaGeoMapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [data, setData] = useState<GeoAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchGeoData(activeFilter);
    }
  }, [isOpen, activeFilter]);

  // Initialize & Update Leaflet Interactive OpenStreetMap
  useEffect(() => {
    if (!isOpen || !mounted || !mapContainerRef.current) return;

    // Load Leaflet CSS & JS dynamically if not present
    if (!(window as any).L) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        initLeafletMap();
      };
      document.body.appendChild(script);
    } else {
      initLeafletMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mounted]);

  // Update map markers when data changes
  useEffect(() => {
    if (data && mapInstanceRef.current && (window as any).L) {
      updateMapMarkers(data.cities);
    }
  }, [data]);

  const initLeafletMap = () => {
    if (!mapContainerRef.current || mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;
    const map = L.map(mapContainerRef.current, {
      center: [22.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    // Add OpenStreetMap Tile Layer (Matching Image 2 Google/OSM tile map)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    if (data && data.cities) {
      updateMapMarkers(data.cities);
    }
  };

  const updateMapMarkers = (cities: CityGeoData[]) => {
    if (!mapInstanceRef.current || !(window as any).L) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // ONLY render red markers for cities with actual visitor traffic (visitors > 0)
    const activeCities = cities.filter((c) => c.visitors > 0);

    activeCities.forEach((city) => {
      const radius = Math.max(16, Math.min(36, city.visitors * 4 + 16));

      // Custom pulsing vibrant red dot div icon
      const customIcon = L.divIcon({
        className: "custom-red-dot-marker",
        html: `
          <div style="position: relative; display: flex; items-center; justify-content: center;">
            <div style="position: absolute; width: ${radius * 2}px; height: ${radius * 2}px; border-radius: 50%; background: rgba(255, 23, 68, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; top: -${radius * 0.5}px; left: -${radius * 0.5}px;"></div>
            <div style="width: ${radius}px; height: ${radius}px; border-radius: 50%; background: #FF1744; border: 2.5px solid #ffffff; box-shadow: 0 0 14px rgba(255,23,68,0.9); cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <span style="width: 5px; height: 5px; background: #ffffff; border-radius: 50%;"></span>
            </div>
          </div>
        `,
        iconSize: [radius, radius],
        iconAnchor: [radius / 2, radius / 2],
      });

      const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(map);

      // Popup Content on click/hover
      const popupContent = `
        <div style="font-family: monospace; font-size: 11px; padding: 6px; min-width: 180px;">
          <strong style="color: #FF1744; font-size: 14px; text-transform: uppercase; display: block; margin-bottom: 2px;">${city.city}</strong>
          <span style="color: #666; font-size: 10px; display: block; margin-bottom: 8px;">${city.state}, India</span>
          <div style="border-top: 1px solid #eee; padding-top: 6px; line-height: 1.7;">
            <div><b>Filter Visitors:</b> <span style="color: #1ab0bc; font-weight: bold;">${city.visitors}</span></div>
            <div><b>Chat Inquiries:</b> <span style="color: #d97706; font-weight: bold;">${city.chatLeads}</span></div>
            <div><b>Converted Leads:</b> <span style="color: #059669; font-weight: bold;">${city.convertedLeads}</span></div>
            <div><b>Unregistered Guests:</b> <span style="color: #4b5563; font-weight: bold;">${city.unregisteredVisitors}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current.push(marker);
    });
  };

  const fetchGeoData = async (filterKey: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/visitor-geo-analytics?filter=${filterKey}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load map analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleCityFocus = (cityName: string) => {
    if (!data || !data.cities || !mapInstanceRef.current) return;
    const target = data.cities.find((c) => c.city.toLowerCase().includes(cityName.toLowerCase()));
    if (target) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 9, { duration: 1.5 });
      if (target.visitors > 0) {
        const marker = markersRef.current.find((m) => {
          const latLng = m.getLatLng();
          return Math.abs(latLng.lat - target.lat) < 0.01 && Math.abs(latLng.lng - target.lng) < 0.01;
        });
        if (marker) marker.openPopup();
      } else {
        toast.info(`No active visitor traffic recorded for ${target.city} under this filter.`);
      }
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.cities) return;
    const activeCities = data.cities.filter((c) => c.visitors > 0);
    const headers = ["City", "State", "Latitude", "Longitude", "Visitors", "Chat Leads", "Converted Leads"];
    const rows = activeCities.map((c) => [`"${c.city}"`, `"${c.state}"`, c.lat, c.lng, c.visitors, c.chatLeads, c.convertedLeads]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SSPACIA_India_Geo_Traffic_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Geo traffic report exported to CSV!");
  };

  if (!isOpen || !mounted) return null;

  const modalJSX = (
    <div className="fixed inset-0 z-[999999] bg-black/75 backdrop-blur-md flex items-center justify-center p-2 md:p-6 animate-in fade-in overflow-hidden">
      <div className="bg-white border border-gray-300 w-full max-w-[1600px] h-[94vh] rounded-lg flex flex-col shadow-2xl overflow-hidden text-gray-800 relative">
        
        {/* TOP HEADER BAR */}
        <div className="bg-white px-6 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5 text-red-600 animate-bounce" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg md:text-xl uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <span>India Visitor Geo-Analytics</span>
                <span className="bg-[#1ab0bc] text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest rounded-xs">
                  REAL-TIME MAP
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-2 rounded-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 p-2 transition-all border border-gray-300 rounded-xs cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOP CITY SIMULATION & FILTER BAR */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-mono text-xs">
          
          {/* QUICK CITY SEARCH SPOT BUTTONS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-[11px] text-gray-500 font-sans font-bold whitespace-nowrap">
              Or simulate a search from a popular spot:
            </span>
            {["Ahmedabad", "Mumbai", "Delhi", "Bangalore", "Kolkata", "Surat", "Pune", "Hyderabad", "Jaipur"].map((city) => (
              <button
                key={city}
                onClick={() => handleCityFocus(city)}
                className="bg-white hover:bg-[#1ab0bc] hover:text-white text-gray-700 px-3 py-1 text-[11px] font-bold border border-gray-300 rounded-full transition-all shadow-2xs whitespace-nowrap cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>

          {/* FILTER CATEGORY TABS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {[
              { key: "all", label: "🌐 All" },
              { key: "unregistered", label: "👤 Unregistered" },
              { key: "chat", label: "💬 Chat Users" },
              { key: "loggedout", label: "🚪 Logged-Out" },
              { key: "converted", label: "✅ Converted" },
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setActiveFilter(btn.key)}
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-all rounded-xs border cursor-pointer ${
                  activeFilter === btn.key
                    ? "bg-red-600 text-white border-red-600 shadow-sm scale-105"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>

        {/* 100% FULL-WIDTH INTERACTIVE LEAFLET / OPENSTREETMAP MAP CANVAS */}
        <div className="flex-1 relative w-full h-full bg-[#aad3df]">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* KPI SUMMARY OVERLAY CARD (BOTTOM LEFT OF MAP) */}
          {data && (
            <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md p-4 border border-gray-300 shadow-2xl rounded-sm font-mono text-xs space-y-2">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-1.5 text-gray-900 font-bold uppercase text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-red-600" />
                <span>Real-Time Visitor Data</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between gap-6"><span className="text-gray-500">Active Visitor Dots:</span> <b className="text-red-600">{data.summary.totalCities} Cities</b></div>
                <div className="flex justify-between gap-6"><span className="text-gray-500">Filter Visitors:</span> <b className="text-[#1ab0bc]">{data.summary.totalVisitors}</b></div>
                <div className="flex justify-between gap-6"><span className="text-gray-500">Chat Inquiries:</span> <b className="text-amber-600">{data.summary.totalChatLeads}</b></div>
                <div className="flex justify-between gap-6"><span className="text-gray-500">Converted Accounts:</span> <b className="text-emerald-600">{data.summary.totalConverted}</b></div>
              </div>
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
