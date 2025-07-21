export interface User {
    id: string;
    name: string;
  }
  
  export interface Point {
    x: number;
    y: number;
  }
  
  export interface Stroke {
    points: Point[];
    color: string;
    userId: string;
    userName: string;
  }
  
  export interface Participant {
    cursor: Point;
    color: string;
    name: string;
    strokes: Stroke[];
  }
  
  export interface Painting {
    id: string;
    event_id: string;
    title: string;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
    created_by: string;
    created_at: string;
    updated_at: string;
  }
  
  export interface Event {
    id: string;
    name: string;
    date: string;
    created_at: string;
    updated_at: string;
    image_url?: string;
  }