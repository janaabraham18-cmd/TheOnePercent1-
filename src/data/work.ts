import type { ImageMetadata } from 'astro';

import ssCover from '../assets/work/gallery-walking-deadvlei.jpg';
import ssStars from '../assets/work/gallery-stars-over-the-namib.jpg';
import ssCruise from '../assets/work/catamaran-cruise.jpg';
import ssDune from '../assets/work/gallery-climbing-the-dune.jpg';
import stCover from '../assets/work/court-wide.jpg';
import stWall from '../assets/work/climbing-wall.jpg';
import stCafe from '../assets/work/cafe-mezzanine.jpg';
import stBumper from '../assets/work/bumper-balls.jpg';

export type Photo = { src: ImageMetadata; alt: string };

export type Project = {
  slug: string;
  client: string;
  /** Exactly-matching word in `client` set in the serif italic. */
  accent: string;
  sector: string;
  location: string;
  year: string;
  services: string[];
  /** Live URL, or '' while the site isn't public yet. */
  url: string;
  urlLabel: string;
  teaser: string;
  brief: string;
  built: { title: string; body: string }[];
  details: string[];
  cover: Photo;
  gallery: Photo[];
};

export const projects: Project[] = [
  {
    slug: 'salt-and-sun-tours',
    client: 'Salt and Sun Tours',
    accent: 'Sun',
    sector: 'Tour operator',
    location: 'Walvis Bay, Namibia',
    year: '2026',
    services: ['Website design', 'Development', 'Content structure'],
    url: 'https://saltandsuntours.com.na',
    urlLabel: 'saltandsuntours.com.na',
    teaser:
      'A full website for a Namibian tour operator: eleven signature tours, adventure activities and multi-day self-drive journeys, all bookable through one enquiry flow.',
    brief:
      'Salt and Sun runs day tours, adventure activities, multi-day self-drive journeys and transport around Swakopmund and Walvis Bay. Every booking is a personal quote from a real person, not an automated checkout. The old WordPress site couldn’t show how much they offer, or how personal the service is.',
    built: [
      {
        title: 'Tours, adventures and journeys',
        body: 'Three clear ways into the catalogue: eleven full-day signature tours, shorter adventure activities, and multi-day journeys planned day by day.',
      },
      {
        title: 'Route maps for every journey',
        body: 'Each self-drive journey has a route map of Namibia and a day-by-day itinerary, so travellers can see where they’ll be each day.',
      },
      {
        title: 'One booking request flow',
        body: 'A single form for tours, adventures, journeys, custom combinations and transport-only trips, which goes straight to the team’s inbox.',
      },
      {
        title: 'Gallery, FAQ and the founder’s story',
        body: 'Real photos from past tours, answers to the questions travellers always ask, and an About section telling the founder’s story.',
      },
    ],
    details: [
      'Old WordPress links still indexed by Google redirect to the right new pages, so no search traffic was lost.',
      'Checked at every size from a phone to the TV the client presents on, including the laptop widths in between.',
      'Text over photos sits on a soft gradient instead of a dark box, so the landscapes stay the hero.',
      'One hand-picked word in every heading is set in the brand’s accent colour.',
      'A plain-text summary file helps AI assistants describe the business accurately.',
    ],
    cover: { src: ssCover, alt: 'A traveller walking across the white clay pan of Deadvlei, with red dunes behind' },
    gallery: [
      { src: ssStars, alt: 'The Milky Way over a quiver tree in the Namib Desert' },
      { src: ssDune, alt: 'Guests climbing a red dune beside their tour vehicle' },
      { src: ssCruise, alt: 'Two catamarans under sail on Walvis Bay' },
    ],
  },
  {
    slug: 'springtide-adventure-park',
    client: 'Springtide Adventure Park',
    accent: 'Adventure',
    sector: 'Trampoline & adventure park',
    location: 'Swakopmund, Namibia',
    year: '2026',
    services: ['Website design', 'Development', 'Booking flow'],
    url: '',
    urlLabel: '',
    teaser:
      'A bright, bouncy website for a trampoline and adventure park, with a booking form that only offers session times that actually fit that day.',
    brief:
      'Springtide is a trampoline and adventure park in Swakopmund with open courts, dodgeball, slam-dunk lanes, a battle beam, bumper balls, a climbing wall, a café and party rooms. Parents needed to see what’s there, check prices and hours, and book a session without having to call first.',
    built: [
      {
        title: 'Every zone on the home page',
        body: 'Each play zone has its own photo and a short description, so parents know what their kids are in for before they arrive.',
      },
      {
        title: 'Smart session booking',
        body: 'The form applies weekday or weekend rates automatically and only offers start times that leave enough time before closing for the jump length chosen.',
      },
      {
        title: 'Café and party rooms',
        body: 'Dedicated pages for the café menu and for party bookings: the two things that bring people back.',
      },
      {
        title: 'About Us',
        body: 'The story of the two mothers who built and run the park, told in the first person.',
      },
    ],
    details: [
      'Prices, opening hours and contact details all live in one data file, so updates take minutes.',
      'Content that hasn’t been confirmed yet is clearly flagged until the client signs it off, so nothing invented goes live.',
      'The header wordmark stacks the full name so it fits the navigation on every screen size.',
      'Checked at six widths, from a phone to a TV, with no sideways scrolling on any page.',
    ],
    cover: { src: stCover, alt: 'The main trampoline court at Springtide Adventure Park' },
    gallery: [
      { src: stWall, alt: 'The climbing wall above the foam pit' },
      { src: stBumper, alt: 'Bumper balls in the netted arena' },
      { src: stCafe, alt: 'Café seating on the mezzanine overlooking the courts' },
    ],
  },
];
