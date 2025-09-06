/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Bath, Sparkles, ChefHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoomTypeSelectorProps {
  // No longer needed as we navigate directly
}

const roomTypes = [
  {
    id: 'hall-bedroom',
    title: 'Hall & Bedroom',
    description: 'Premium tiles for living spaces',
    icon: Home,
    gradient: 'bg-gradient-to-br from-primary/10 to-primary/20'
  },
  {
    id: 'bathroom',
    title: 'Bathroom',
    description: 'Water-resistant floor & wall sets',
    icon: Bath,
    gradient: 'bg-gradient-to-br from-blue-500/10 to-blue-600/20'
  },
  {
    id: 'god-room',
    title: 'God Room',
    description: 'Sacred space tile designs',
    icon: Sparkles,
    gradient: 'bg-gradient-to-br from-amber-500/10 to-yellow-600/20'
  },
  {
    id: 'kitchen',
    title: 'Kitchen',
    description: 'Durable kitchen floor & wall tiles',
    icon: ChefHat,
    gradient: 'bg-gradient-to-br from-green-500/10 to-emerald-600/20'
  }
];

const RoomTypeSelector: React.FC<RoomTypeSelectorProps> = () => {
  const navigate = useNavigate();

  const handleRoomSelect = (roomId: string) => {
    navigate(`/${roomId}`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
          Select Room Type
        </h2>
        <p className="text-muted-foreground">
          Choose the space you want to visualize with Kajaria tiles
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roomTypes.map((room) => {
          const IconComponent = room.icon;
          return (
            <Card 
              key={room.id}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/30"
              onClick={() => handleRoomSelect(room.id)}
            >
              <CardContent className="p-8">
                <div className={`${room.gradient} rounded-full w-16 h-16 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
                  {room.title}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {room.description}
                </p>
                <Button 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  variant="outline"
                >
                  View Collection
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RoomTypeSelector;