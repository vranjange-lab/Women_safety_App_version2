import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Phone, 
  Navigation, 
  Search, 
  Check, 
  Shield, 
  Cross, 
  HardHat, 
  Compass, 
  Clock, 
  MapPin, 
  Eye, 
  Info,
  HeartPlus,
  ShieldAlert,
  Locate
} from 'lucide-react';
import { NearbyPlace } from '../types';

interface PlacesModuleProps {
  currentLat?: number;
  currentLng?: number;
}

// Extend place type with image and availability details for hackathon premium aesthetics
interface EnhancedPlace extends NearbyPlace {
  imageUrl: string;
  verifiedLabel: string;
  surveillanceRating: 'High' | 'Standard' | 'Premium';
  activeAgents: number;
}

export default function PlacesModule({ currentLat = 37.774929, currentLng = -122.419416 }: PlacesModuleProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'police' | 'hospital' | 'safe_house' | 'pharmacy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<EnhancedPlace[]>([]);
  const [alertCallNumber, setAlertCallNumber] = useState<string | null>(null);

  // Active Safe Navigation Route selection
  const [activeRoutePlace, setActiveRoutePlace] = useState<EnhancedPlace | null>(null);

  // Initialize places dynamically relative to current GPS coordinates
  useEffect(() => {
    const latOffset = currentLat || 37.774929;
    const lngOffset = currentLng || -122.419416;

    const basePlaces: EnhancedPlace[] = [
      {
        id: 'p1',
        name: 'Metro Police Division - Headquarters',
        type: 'police',
        address: 'Civic Plaza Blvd, Central Government Block',
        phone: '+1 (555) 019-9111',
        distance: '0.3 km',
        lat: latOffset + 0.0018,
        lng: lngOffset - 0.0012,
        imageUrl: 'https://images.unsplash.com/photo-1549880181-56a44cf8a4a1?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: '24/7 Active Tactical Desk',
        surveillanceRating: 'Premium',
        activeAgents: 14
      },
      {
        id: 'p2',
        name: 'SafeHer Community Sanctuary & Sentry Hub',
        type: 'safe_house',
        address: '582 Broadway Avenue, Late Night Open Portal',
        phone: '+1 (555) 014-4882',
        distance: '0.6 km',
        lat: latOffset - 0.0028,
        lng: lngOffset + 0.0035,
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: 'Verified Guardian Safehouse',
        surveillanceRating: 'Premium',
        activeAgents: 4
      },
      {
        id: 'p3',
        name: 'St. Jude General Trauma & Emergency Center',
        type: 'hospital',
        address: '99 Medical Ridge Parkway',
        phone: '+1 (555) 018-0909',
        distance: '1.2 km',
        lat: latOffset + 0.0075,
        lng: lngOffset + 0.0055,
        imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce2?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: '24/7 Medical Surgical On-Call',
        surveillanceRating: 'Standard',
        activeAgents: 25
      },
      {
        id: 'p4',
        name: 'Central Police Station - Substation B',
        type: 'police',
        address: '402 Pine Street Alley Corner (24/7 Guard Desk)',
        phone: '+1 (555) 019-9222',
        distance: '0.8 km',
        lat: latOffset - 0.0038,
        lng: lngOffset - 0.0048,
        imageUrl: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: 'Sentry Patrol Station',
        surveillanceRating: 'High',
        activeAgents: 8
      },
      {
        id: 'p5',
        name: 'Womens Volunteer Shelter - SafeHaven House',
        type: 'safe_house',
        address: '12 Oakwood Court (Protected Safe Gateway)',
        phone: '+1 (555) 016-1133',
        distance: '1.5 km',
        lat: latOffset + 0.0115,
        lng: lngOffset - 0.0085,
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: 'Anonymous Women Recovery Haven',
        surveillanceRating: 'High',
        activeAgents: 2
      },
      {
        id: 'p6',
        name: 'Sentinel 24/7 MedRx Pharmacy',
        type: 'pharmacy',
        address: '710 Market Street, Near Central Sentry Depot',
        phone: '+1 (555) 019-4402',
        distance: '0.5 km',
        lat: latOffset + 0.0025,
        lng: lngOffset + 0.0022,
        imageUrl: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: '24H Open & Lit Chemist',
        surveillanceRating: 'High',
        activeAgents: 3
      },
      {
        id: 'p7',
        name: 'Downtown Allied Medical & Pharm Depot',
        type: 'pharmacy',
        address: '33 Grand Avenue Corner Plaza',
        phone: '+1 (555) 019-5511',
        distance: '1.1 km',
        lat: latOffset - 0.0062,
        lng: lngOffset + 0.0068,
        imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=400',
        verifiedLabel: '24/7 Lit Medical Outpost',
        surveillanceRating: 'Standard',
        activeAgents: 5
      }
    ];

    setPlaces(basePlaces);
    // default highlighted route to the nearest safe house
    setActiveRoutePlace(basePlaces[1]);
  }, [currentLat, currentLng]);

  const filteredPlaces = places.filter((place) => {
    const matchesType = selectedType === 'all' || place.type === selectedType;
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          place.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div id="nearby_places_module" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl space-y-6 text-left">
      
      {/* Header Panel */}
      <div className="pb-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-base tracking-tight text-slate-100 flex items-center gap-1.5">
            Emergency Care & Safe Zones Tracker
            <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-emerald-500/20 text-emerald-300 font-extrabold rounded-full">Sentry Monitored</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Explore active emergency services, 24/7 pharmacies, police desks, and secure spaces in your radius.</p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-800 rounded-xl max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Station, Hospital or Med-Rx..."
            className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-500 w-full"
          />
        </div>
      </div>

      {/* Filter Tabs Grid */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { id: 'all', label: 'All Safe Places', icon: Compass },
          { id: 'police', label: 'Police Stations', icon: Shield },
          { id: 'safe_house', label: 'Guardian Safe Houses', icon: HardHat },
          { id: 'hospital', label: 'Hospitals & Medical', icon: Cross },
          { id: 'pharmacy', label: '24/7 Pharmacies', icon: HeartPlus }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as any)}
              className={`py-2 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold tracking-tight transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-emerald-500 border-emerald-600 text-slate-950 font-black'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Two-Column Canvas Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Dynamic Safe list */}
        <div className="lg:col-span-7 space-y-3.5 max-h-[510px] overflow-y-auto pr-1">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-16 border border-slate-800 rounded-2xl bg-slate-950/40">
              <Map className="w-10 h-10 text-slate-600 mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-slate-400">No verified locations found in this query.</p>
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isRouteTarget = activeRoutePlace?.id === place.id;
              return (
                <div
                  key={place.id}
                  onClick={() => setActiveRoutePlace(place)}
                  className={`p-4 rounded-3xl bg-slate-950 border transition-all flex flex-col md:flex-row gap-4 items-center cursor-pointer ${
                    isRouteTarget 
                      ? 'border-emerald-500 bg-slate-950/90 shadow-glow shadow-emerald-900/10' 
                      : 'border-slate-850 hover:border-slate-700 bg-slate-950/40'
                  }`}
                >
                  {/* Photo Thumbnail with referer safe headers */}
                  {place.imageUrl && (
                    <div className="w-full md:w-28 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 relative bg-slate-900">
                      <img 
                        src={place.imageUrl} 
                        alt={place.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[8px] uppercase bg-black/75 rounded font-black text-slate-200">
                        {place.distance}
                      </span>
                    </div>
                  )}

                  {/* Body textual list */}
                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-block py-0.5 px-2 text-[8px] font-black uppercase rounded ${
                          place.type === 'police'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                            : place.type === 'hospital'
                            ? 'bg-red-500/15 text-rose-450 border border-red-500/20'
                            : place.type === 'pharmacy'
                            ? 'bg-teal-500/15 text-teal-400 border border-teal-500/20'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {place.type === 'safe_house' ? 'Secure Haven' : place.type}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/5 px-2.5 rounded-full border border-emerald-555/15 inline-flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> CCTV {place.surveillanceRating}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-xs text-slate-100 leading-tight">{place.name}</h4>
                    <p className="text-[10px] text-slate-400">{place.address}</p>

                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2 text-[10px] text-slate-500 font-bold border-t border-slate-900">
                      <span className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                        <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
                        {place.distance} away
                      </span>
                      {place.phone && (
                        <span className="text-[9px] text-slate-500">{place.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* Right quick dialer keys */}
                  {place.phone && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAlertCallNumber(place.phone || null);
                      }}
                      className="p-3 bg-slate-900 hover:bg-emerald-500/10 border border-slate-800 text-emerald-400 rounded-full transition-all shrink-0 cursor-pointer self-stretch md:self-center flex items-center justify-center"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Tactical Sentry Map Radar Column */}
        <div className="lg:col-span-5 space-y-4 w-full">
          
          {/* HIGH POLISH MAP RADAR CANVAS PREVIEW */}
          <div className="p-4 bg-slate-950 border border-slate-850 rounded-3xl flex flex-col justify-between items-center relative overflow-hidden select-none min-h-[290px] shadow-lg">
            
            {/* Visual ambient rings */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-transparent to-transparent pointer-events-none" />
            
            <div className="w-full flex items-center justify-between z-10 text-[9px] text-emerald-400 tracking-widest font-extrabold uppercase">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping shrink-0" />
                Live Compass Radar
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-400 text-[8px]">
                ACCY: &plusmn; 3m
              </span>
            </div>

            {/* Simulated Live Sentry Area Radar Map preview */}
            <div className="my-5 border border-slate-800/80 rounded-full w-44 h-44 flex items-center justify-center relative bg-slate-900/10">
              {/* Outer wave rings */}
              <div className="absolute border border-emerald-500/10 rounded-full w-42 h-42 animate-pulse" />
              <div className="absolute border border-slate-800/40 rounded-full w-32 h-32" />
              <div className="absolute border border-slate-850/60 rounded-full w-20 h-20" />
              <div className="absolute border border-slate-850/30 rounded-full w-8 h-8" />
              
              {/* Center user dot */}
              <div className="w-4 h-4 bg-blue-500 border-2 border-slate-950 rounded-full z-10 relative">
                <span className="absolute inset-0 w-full h-full rounded-full bg-blue-500/40 animate-ping" />
              </div>

              {/* Verified safe places mapped on a circular trigonometric trajectory */}
              {filteredPlaces.map((p, idx) => {
                // calculate layout map directions
                const angle = (idx * 365) / (filteredPlaces.length || 1) + 25;
                const radius = 55 + (idx * 4);
                const translationX = Math.cos((angle * Math.PI) / 180) * radius;
                const translationY = Math.sin((angle * Math.PI) / 180) * radius;
                const isSelected = activeRoutePlace?.id === p.id;

                const markerColorClass = p.type === 'police' 
                  ? 'bg-blue-500' 
                  : p.type === 'hospital' 
                  ? 'bg-rose-500' 
                  : p.type === 'pharmacy' 
                  ? 'bg-teal-500' 
                  : 'bg-emerald-500';

                return (
                  <button
                    key={p.id}
                    style={{ transform: `translate(${translationX}px, ${translationY}px)` }}
                    onClick={() => setActiveRoutePlace(p)}
                    className={`absolute p-1 rounded-full transition-all duration-300 transform hover:scale-130 active:scale-90 border-2 z-10 ${
                      isSelected 
                        ? 'border-white bg-emerald-400 scale-120 text-slate-950 shadow-lg shadow-emerald-500/30' 
                        : `border-slate-950 ${markerColorClass} text-slate-100 hover:scale-110`
                    }`}
                  >
                    {p.type === 'police' && <Shield className="w-3.5 h-3.5 font-bold" />}
                    {p.type === 'hospital' && <Cross className="w-3.5 h-3.5 font-bold" />}
                    {p.type === 'pharmacy' && <HeartPlus className="w-3.5 h-3.5 font-bold" />}
                    {p.type === 'safe_house' && <HardHat className="w-3.5 h-3.5 font-bold" />}
                  </button>
                );
              })}
            </div>

            <div className="w-full flex justify-between text-[8px] text-slate-500 uppercase tracking-tight z-10 leading-none">
              <span>LAT: {currentLat.toFixed(4)}</span>
              <span>LNG: {currentLng.toFixed(4)}</span>
            </div>
          </div>

          {/* CCTV SAFE PATH DIRECTIONS CARD */}
          {activeRoutePlace && (
            <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl text-left space-y-3.5 animate-slide-up shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Safe Sentry Path Coordinates</span>
                </div>
                <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono font-black p-1 px-2 rounded-lg flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> 6 mins walk
                </span>
              </div>

              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Target Destination Spot:</p>
                <p className="text-xs font-black text-slate-100">{activeRoutePlace.name}</p>
                <p className="text-[10px] text-slate-400 font-medium pl-0.5 mt-0.5">{activeRoutePlace.address}</p>
              </div>

              {/* Logical walking guidelines */}
              <div className="space-y-2 text-[11px] text-slate-400 leading-normal font-medium pr-0.5">
                <div className="p-2 bg-slate-900/60 border border-slate-900 rounded-xl flex items-start gap-2.5">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">1</span>
                  <div>
                    <p className="text-slate-300 font-bold">Head toward Mainlit Corridor</p>
                    <p className="mt-0.5 text-[10px]">Follow continuous street lighting. This segment boasts CCTV camera coverage rated 100%.</p>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/60 border border-slate-900 rounded-xl flex items-start gap-2.5">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">2</span>
                  <div>
                    <p className="text-slate-350 font-bold flex items-center gap-1">
                      Avoid Pine-Lane Shortcuts <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-450">Sentry cameras indicate low luminance. Bypass this dark segment completely.</p>
                  </div>
                </div>

                <div className="p-2 bg-slate-900/60 border border-slate-900 rounded-xl flex items-start gap-2.5">
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">3</span>
                  <div>
                    <p className="text-slate-305 font-bold">Safe Zone Reception Lobby</p>
                    <p className="mt-0.5 text-[10px]">Sentry guards are stationed outside this terminal. Proceed to check-in for complete escort support.</p>
                  </div>
                </div>
              </div>

              {/* Trigger Direct Navigation in external Google maps handler */}
              <button
                onClick={() => {
                  const queryParam = `${activeRoutePlace.lat || currentLat},${activeRoutePlace.lng || currentLng}`;
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${queryParam}&travelmode=walking`;
                  window.open(url, '_blank');
                }}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
              >
                <Locate className="w-4 h-4" /> Start Live Escort Navigation on Google Maps
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hotline dialog confirmation popup */}
      {alertCallNumber && (
        <div className="fixed inset-0 bg-slate-950/85 z-55 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl animate-fade-in space-y-4">
            <div className="w-14 h-15 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <Phone className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-100">Contact verified Emergency Station</h3>
            <p className="text-xs text-slate-400 leading-normal font-semibold">
              Initiating cellular dispatch line to <span className="font-bold text-slate-200">{alertCallNumber}</span>. Remain on line.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setAlertCallNumber(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 font-bold uppercase transition-all text-xs cursor-pointer text-slate-300"
              >
                Abort
              </button>
              <button
                onClick={() => {
                  window.location.href = `tel:${alertCallNumber}`;
                  setAlertCallNumber(null);
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-black uppercase transition-all text-xs cursor-pointer text-slate-950"
              >
                Initiate Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
