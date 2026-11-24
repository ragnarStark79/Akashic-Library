import type { TopBookItem } from '../types';
import coverMilkteeth from '../../../assets/images/cards/card-milkteeth.png';
import coverLethalKiss from '../../../assets/images/cards/card-lethalkiss.png';
import coverBonesOfJade from '../../../assets/images/cards/card-bonesofjade.png';
import coverMonstersOfOhio from '../../../assets/images/cards/card-monstersofohio.png';
import coverStations from '../../../assets/images/cards/card-stations.png';
import coverThereUsedToBePeople from '../../../assets/images/cards/card-thereusedtobepeople.png';

export const TOP_BOOKS_DATA: TopBookItem[] = [
  {
    id: '623f3f0a-a6d3-4c26-ad5f-18ce3343c9bb',
    slug: 'milkteeth',
    title: 'Milkteeth',
    author: 'Caitlin Starling',
    description:
      'A dark, seductive tale of hunger, love, and transformation from the bestselling author of The Death of Jane Lawrence.',
    coverImage: coverMilkteeth,
    backgroundColor: '#5e0f12',
    textColor: '#FFFFFF',
    genres: [
      { name: 'Horror', backgroundColor: '#000000', color: '#FFFFFF' },
      { name: 'LGBTQIA+', backgroundColor: '#e6ff2b', color: '#000000' },
      { name: 'Gothic', backgroundColor: '#7b50d1', color: '#FFFFFF' },
    ],
    initialRotation: 1.9,
    initialYOffset: 6.5,
  },
  {
    id: '0f4ee72d-0a88-4a56-a08e-036ab9c1d812',
    slug: 'lethal-kiss',
    title: 'Lethal Kiss',
    author: 'Taylor Grothe',
    description:
      "A blood-soaked love story of rage, revenge, and belonging, Taylor Grothe's adult debut is a sapphic horror/romance.",
    coverImage: coverLethalKiss,
    backgroundColor: '#dddf20',
    textColor: '#1C2826',
    genres: [
      { name: 'Romance', backgroundColor: '#ff008f', color: '#FFFFFF' },
      { name: 'Fantasy', backgroundColor: '#9e81e4', color: '#FFFFFF' },
      { name: 'LGBTQIA+', backgroundColor: '#e6ff2b', color: '#000000' },
      { name: 'Horror', backgroundColor: '#000000', color: '#FFFFFF' },
      { name: 'Mystery', backgroundColor: '#006fff', color: '#FFFFFF' },
    ],
    initialRotation: -2.3,
    initialYOffset: -5.5,
  },
  {
    id: '8b3b1be6-9407-486d-b8ef-2d03b46a8b58',
    slug: 'bones-of-jade-flesh-like-ice',
    title: 'Bones of Jade, Flesh like Ice',
    author: 'Gracie Marsden',
    description:
      'A young woman makes a bargain with a shapeshifting demon who promises her power, if she will give up love—a painful price that sets her on a dark journey in this historical fantasy inspired by Taiwanese myth.',
    coverImage: coverBonesOfJade,
    backgroundColor: '#d74a5a',
    textColor: '#FFFFFF',
    genres: [
      { name: 'Debut Novel', backgroundColor: '#00ecef', color: '#000000' },
      { name: 'Fantasy', backgroundColor: '#9e81e4', color: '#FFFFFF' },
      { name: 'Historical', backgroundColor: '#ff9d00', color: '#000000' },
      { name: 'Includes a Cat', backgroundColor: '#ffd2b6', color: '#000000' },
    ],
    initialRotation: 1.8,
    initialYOffset: 5.8,
  },
  {
    id: '3ebd197d-b401-42d7-a369-37e8ad3effca',
    slug: 'monsters-of-ohio',
    title: 'Monsters of Ohio',
    author: 'John Scalzi',
    description:
      'Monsters of Ohio is a heartfelt exploration of a tentacular solution to the struggles of the modern world from the Hugo Award-winning author.',
    coverImage: coverMonstersOfOhio,
    backgroundColor: '#5a8aab',
    textColor: '#FFFFFF',
    genres: [
      { name: 'Sci-Fi', backgroundColor: '#00e500', color: '#000000' },
      { name: 'Satire', backgroundColor: '#897400', color: '#FFFFFF' },
      { name: 'Includes a Cat', backgroundColor: '#ffd2b6', color: '#000000' },
      { name: 'Includes a Dog', backgroundColor: '#e62701', color: '#FFFFFF' },
    ],
    initialRotation: -2.0,
    initialYOffset: -6.0,
  },
  {
    id: '9d853c55-9381-4236-9930-e2acac208c81',
    slug: 'stations',
    title: 'Stations',
    author: 'Louise Kennedy',
    description:
      'A woman is haunted by the unsettled boy who befriended her as a teenager, long after he drowned, in this powerful novel.',
    coverImage: coverStations,
    backgroundColor: '#d7bbda',
    textColor: '#1C2826',
    genres: [
      { name: 'Literary', backgroundColor: '#71002e', color: '#FFFFFF' },
      { name: 'Includes a Dog', backgroundColor: '#e62701', color: '#FFFFFF' },
    ],
    initialRotation: 1.7,
    initialYOffset: 5.2,
  },
  {
    id: 'b0d6c269-68b8-42f4-b4ae-d2ebdbcf052f',
    slug: 'there-used-to-be-people-here',
    title: 'There Used to Be People Here',
    author: 'Eliot Peper',
    description:
      'In 1970s Mississippi, a Black detective and his temporary partner confront mysterious occurrences in a chilling speculative thriller.',
    coverImage: coverThereUsedToBePeople,
    backgroundColor: '#081424',
    textColor: '#FFFFFF',
    genres: [
      { name: 'Debut Novel', backgroundColor: '#00ecef', color: '#000000' },
      { name: 'Sci-Fi', backgroundColor: '#00e500', color: '#000000' },
      { name: 'Thriller', backgroundColor: '#3d3195', color: '#FFFFFF' },
      { name: 'LGBTQIA+', backgroundColor: '#e6ff2b', color: '#000000' },
      { name: 'Includes a Dog', backgroundColor: '#e62701', color: '#FFFFFF' },
    ],
    initialRotation: -2.2,
    initialYOffset: -5.0,
  },
];
