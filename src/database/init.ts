import { useEffect } from 'react';
import { runMigrations } from '../database/migrations';

export const useDatabaseInit = () => {
  useEffect(() => {
    const init = async () => {
      try {
        await runMigrations();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    init();
  }, []);
};
