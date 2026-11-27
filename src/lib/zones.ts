import { ZONE_SHAPES } from "./geo/ogun-map";
import type { Zone } from "./types";

const PROFILE: Record<string, { towns: string[]; est: string; weight: number; speed: number }> = {
  abs: { towns: ["Ake", "Oke-Ilewo", "Ibara", "Isale-Igbein", "Onikolobo", "Kuto"], est: "2008", weight: 1.15, speed: 1 },
  abn: { towns: ["Akomoje", "Iberekodo", "Lafenwa", "Obantoko", "Odeda", "Osiele"], est: "2010", weight: 0.9, speed: 1.1 },
  ifo: { towns: ["Ifo", "Akute", "Ojodu-Abiodun", "Agbado", "Itori", "Ewekoro", "Papalanto"], est: "2009", weight: 1.55, speed: 1.25 },
  atn: { towns: ["Atan", "Ota", "Sango", "Agbara", "Igbesa", "Ijoko", "Ado-Odo"], est: "2009", weight: 1.7, speed: 1.15 },
  mow: { towns: ["Mowe", "Ofada", "Ibafo", "Arepo", "Magboro", "Owode-Egba", "Asese"], est: "2012", weight: 1.6, speed: 0.95 },
  sag: { towns: ["Sagamu", "Makun", "Ode-Lemo", "Isote", "Sabo", "Ogijo"], est: "2008", weight: 1.2, speed: 0.9 },
  ikn: { towns: ["Ikenne", "Ilishan", "Iperu", "Ogere", "Isara", "Akaka-Remo"], est: "2011", weight: 0.7, speed: 0.85 },
  ijo: { towns: ["Ijebu-Ode", "Imepe", "Ijasi", "Itantebo", "Ilese", "Atan-Ijebu"], est: "2008", weight: 1.0, speed: 1 },
  ago: { towns: ["Ago-Iwoye", "Ijebu-Igbo", "Oru", "Awa", "Ilaporu", "Mamu"], est: "2014", weight: 0.55, speed: 1.05 },
  odo: { towns: ["Odogbolu", "Ososa", "Idowa", "Aiyepe", "Ala", "Imodi", "Imosan", "Ijebu-Ijesha"], est: "2013", weight: 0.5, speed: 0.8 },
  ije: { towns: ["Ogbere", "Ijebu-Mushin", "Ibiade", "Abigi", "Ode-Omi", "Makun-Omi"], est: "2015", weight: 0.35, speed: 1.3 },
  yen: { towns: ["Ayetoro", "Imeko", "Joga-Orile", "Igan-Okoto", "Iwoye-Ketu", "Afon"], est: "2012", weight: 0.4, speed: 1.2 },
  ila: { towns: ["Ilaro", "Idiroko", "Ipokia", "Owode-Yewa", "Oja-Odan", "Ajilete"], est: "2010", weight: 0.65, speed: 1.1 },
};

export const zoneTowns = (id: string) => PROFILE[id]?.towns ?? [];
export const zoneWeight = (id: string) => PROFILE[id]?.weight ?? 1;
export const zoneSpeed = (id: string) => PROFILE[id]?.speed ?? 1;

export function initialZones(): Zone[] {
  return ZONE_SHAPES.map((z) => ({
    id: z.id,
    name: z.name,
    code: z.code,
    office: z.office,
    lgas: [...z.lgas],
    established: PROFILE[z.id].est,
    address: `Zonal Planning Office, ${z.office}, Ogun State`,
    phone: "",
    towns: PROFILE[z.id].towns.join(", "),
    boundaries: "",
  }));
}
