import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Monitor, Trash2, Database, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useStockStore } from '@/store/useStockStore';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { clearActiveUpload } = useStockStore();
  const navigate = useNavigate();
  
  const [isClearing, setIsClearing] = useState(false);
  
  const handleFactoryReset = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL stock uploads, snapshots, and counts from the cloud database. This action cannot be undone! Are you absolutely sure?")) {
      return;
    }
    
    // Extra safety confirmation
    if (prompt("Type 'DELETE' to confirm clearing the database:") !== 'DELETE') {
      return;
    }

    setIsClearing(true);
    try {
      // Due to cascading deletes, deleting from stock_uploads will delete everything
      const { error } = await supabase
        .from('stock_uploads')
        .delete()
        .neq('id', 0); // Hack to delete all rows securely if RLS permits
        
      if (error) throw error;
      
      clearActiveUpload();
      alert("Database has been successfully cleared.");
      navigate('/');
    } catch (error: any) {
      console.error("Error clearing database:", error);
      alert("Failed to clear database: " + error.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your application preferences and data.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how StockSync looks on your device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-5 w-5" />
                  Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-5 w-5" />
                  Dark
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'} 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => setTheme('system')}
                >
                  <Monitor className="h-5 w-5" />
                  System
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>Your current login session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Email Address</label>
              <p className="font-medium">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Account ID</label>
              <p className="text-xs text-muted-foreground font-mono truncate">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-red-200 dark:border-red-900/50">
          <CardHeader className="bg-red-50 dark:bg-red-950/20 rounded-t-xl border-b border-red-100 dark:border-red-900/50">
            <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">
              Destructive actions that cannot be reversed.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-foreground">Factory Reset Database</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  This will permanently delete all uploaded files, stock snapshots, and physical counts from the Supabase cloud database. Use this only when starting a completely new cycle.
                </p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleFactoryReset} 
                disabled={isClearing}
                className="shrink-0"
              >
                {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear Entire Database
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
