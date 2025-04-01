import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMentorSchema, insertMenteeSchema, VALID_MBTI } from "@shared/schema";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMentorMutation, registerMenteeMutation } = useAuth();

  if (user) {
    return <Redirect to={user.role === 'mentor' ? '/mentor' : '/'} />;
  }

  return (
    <div className="min-h-screen w-full flex md:items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">Welcome to Peptok</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="hidden md:block text-center">
          <h1 className="text-4xl font-bold mb-4">The platform for the experience that matters!</h1>
          <p className="text-muted-foreground">
            Connect with experienced professionals who can guide you on your career journey.
            Our intelligent matching system ensures the best mentor-mentee fit.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Login
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { registerMentorMutation, registerMenteeMutation } = useAuth();
  const [role, setRole] = useState<'mentor' | 'mentee'>('mentee');

  const form = useForm({
    resolver: zodResolver(role === 'mentor' ? insertMentorSchema : insertMenteeSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      lastWorkRole: "",
      skills: "",
      location: "",
      mbti: "INTJ",
      experience: "0",
      imageUrl: "",
      // Mentor specific
      maxMatch: "3",
      interests: "",
      motivation: "",
      // Mentee specific
      careerGoals: "",
      preferredSkills: "",
      industrySpecificNeeds: "",
      role,
    },
  });

  const mutation = role === 'mentor' ? registerMentorMutation : registerMenteeMutation;

  useEffect(() => {
    form.setValue('role', role);
  }, [role, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Button
            type="button"
            variant={role === 'mentee' ? 'default' : 'outline'}
            onClick={() => setRole('mentee')}
          >
            Register as Mentee
          </Button>
          <Button
            type="button"
            variant={role === 'mentor' ? 'default' : 'outline'}
            onClick={() => setRole('mentor')}
          >
            Register as Mentor
          </Button>
        </div>

        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastWorkRole"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Work Role</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="skills"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skills (comma-separated)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="React, Node.js, TypeScript" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mbti"
            render={({ field }) => (
              <FormItem>
                <FormLabel>MBTI Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your MBTI type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VALID_MBTI.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Years of Experience</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Image URL</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {role === 'mentor' ? (
            <>
              <FormField
                control={form.control}
                name="maxMatch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Mentees</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interests (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Startups, Healthcare, AI" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motivation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivation for Mentoring</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Why do you want to be a mentor?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <>
              <FormField
                control={form.control}
                name="careerGoals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Career Goals</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="What are your career aspirations?" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Skills to Learn (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Product Management, Finance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industrySpecificNeeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Specific Needs</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Specific industry knowledge you're seeking" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register
        </Button>
      </form>
    </Form>
  );
}