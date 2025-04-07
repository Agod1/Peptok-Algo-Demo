import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Chat } from "@/components/ui/chat";
import { User } from "@shared/schema";

// Fetch the list of users
const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch users: ${errorText}`);
  }
  try {
    const data = await response.json();
    return Array.isArray(data) ? data : []; // Ensure data is an array
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
};

export default function MessagePage() {
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientImage, setRecipientImage] = useState("");

  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: fetchUsers,
  });

  const startChat = (user: User) => {
    setRecipientId(user.id);
    setRecipientName(user.name);
    setRecipientImage(user.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="flex flex-col items-center justify-center h-screen p-4">
      {!recipientId ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select a User to Chat With</h2>
          <ul className="space-y-2">
            {users.length > 0 ? (
              users.map((user) => (
                <li key={user.id} className="flex items-center space-x-2">
                  <img
                    src={user.image_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.id}`}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{user.name}</span>
                  <Button onClick={() => startChat(user)}>Chat</Button>
                </li>
              ))
            ) : (
              <p>No users found.</p>
            )}
          </ul>
        </div>
      ) : (
        <Chat recipientId={recipientId} recipientName={recipientName} recipientImage={recipientImage} />
      )}
    </div>
  );
}
