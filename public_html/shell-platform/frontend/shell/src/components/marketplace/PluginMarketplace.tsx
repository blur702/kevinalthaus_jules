import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Star,
  Download,
  Shield,
  Clock,
  User,
  Tag,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Loader,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Package
} from 'lucide-react';
import clsx from 'clsx';

interface MarketplacePlugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  longDescription: string;
  version: string;
  author: {
    name: string;
    email?: string;
    url?: string;
    verified: boolean;
  };
  category: string;
  tags: string[];
  icon?: string;
  screenshots: string[];
  remoteUrl: string;
  exposedModule: string;
  permissions: string[];
  dependencies: Array<{
    name: string;
    version: string;
    optional?: boolean;
  }>;
  pricing: {
    type: 'free' | 'paid' | 'freemium';
    price?: number;
    currency?: string;
    trialDays?: number;
  };
  ratings: {
    average: number;
    count: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  stats: {
    downloads: number;
    activeInstallations: number;
    lastUpdated: string;
    createdAt: string;
  };
  compatibility: {
    shellVersion: string;
    nodeVersion?: string;
    browsers?: string[];
  };
  repository?: {
    type: 'git';
    url: string;
  };
  homepage?: string;
  documentation?: string;
  license: string;
  featured: boolean;
  verified: boolean;
  status: 'published' | 'beta' | 'alpha' | 'deprecated';
}

interface PluginMarketplaceProps {
  onInstall: (plugin: MarketplacePlugin) => Promise<void>;
  onUninstall: (pluginId: string) => Promise<void>;
  installedPlugins: string[];
}

const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({
  onInstall,
  onUninstall,
  installedPlugins
}) => {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'rating' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [installingPlugins, setInstallingPlugins] = useState<Set<string>>(new Set());

  const categories = [
    'all',
    'dashboard',
    'user-management',
    'analytics',
    'settings',
    'file-management',
    'communication',
    'productivity',
    'integration',
    'developer-tools'
  ];

  const pricingOptions = [
    'all',
    'free',
    'paid',
    'freemium'
  ];

  useEffect(() => {
    loadMarketplacePlugins();
  }, []);

  const loadMarketplacePlugins = async () => {
    setLoading(true);
    
    try {
      // Simulate API call - in real app, this would fetch from marketplace API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockPlugins: MarketplacePlugin[] = [
        {
          id: 'advanced-dashboard',
          name: 'advanced-dashboard',
          displayName: 'Advanced Dashboard',
          description: 'Enhanced dashboard with advanced analytics and customizable widgets',
          longDescription: 'The Advanced Dashboard plugin provides a comprehensive overview of your application with customizable widgets, real-time analytics, and advanced filtering capabilities. Features include drag-and-drop widget arrangement, custom chart types, and data export functionality.',
          version: '2.1.0',
          author: {
            name: 'DashCorp Solutions',
            email: 'support@dashcorp.com',
            url: 'https://dashcorp.com',
            verified: true
          },
          category: 'dashboard',
          tags: ['dashboard', 'analytics', 'widgets', 'charts', 'real-time'],
          icon: '📊',
          screenshots: ['/screenshots/advanced-dashboard-1.png', '/screenshots/advanced-dashboard-2.png'],
          remoteUrl: 'https://cdn.marketplace.com/plugins/advanced-dashboard/remoteEntry.js',
          exposedModule: './AdvancedDashboard',
          permissions: ['read:dashboard', 'write:dashboard', 'read:analytics'],
          dependencies: [
            { name: 'recharts', version: '^2.8.0' },
            { name: 'react-grid-layout', version: '^1.3.4' }
          ],
          pricing: {
            type: 'paid',
            price: 29.99,
            currency: 'USD',
            trialDays: 14
          },
          ratings: {
            average: 4.8,
            count: 2847,
            distribution: { 1: 23, 2: 45, 3: 178, 4: 892, 5: 1709 }
          },
          stats: {
            downloads: 15420,
            activeInstallations: 8932,
            lastUpdated: '2024-08-28T10:30:00Z',
            createdAt: '2023-05-15T08:00:00Z'
          },
          compatibility: {
            shellVersion: '>=1.0.0',
            nodeVersion: '>=18.0.0',
            browsers: ['Chrome >=90', 'Firefox >=88', 'Safari >=14']
          },
          repository: {
            type: 'git',
            url: 'https://github.com/dashcorp/advanced-dashboard-plugin'
          },
          homepage: 'https://dashcorp.com/plugins/advanced-dashboard',
          documentation: 'https://docs.dashcorp.com/advanced-dashboard',
          license: 'MIT',
          featured: true,
          verified: true,
          status: 'published'
        },
        {
          id: 'team-collaboration',
          name: 'team-collaboration',
          displayName: 'Team Collaboration Suite',
          description: 'Real-time collaboration tools with chat, file sharing, and project management',
          longDescription: 'Transform your workspace into a collaborative environment with real-time chat, file sharing, task management, and video conferencing integration. Perfect for remote teams and distributed workflows.',
          version: '1.4.2',
          author: {
            name: 'CollabTech Inc.',
            verified: false
          },
          category: 'communication',
          tags: ['collaboration', 'chat', 'files', 'project-management', 'team'],
          icon: '👥',
          screenshots: ['/screenshots/team-collab-1.png'],
          remoteUrl: 'https://cdn.marketplace.com/plugins/team-collaboration/remoteEntry.js',
          exposedModule: './TeamCollaboration',
          permissions: ['read:users', 'write:files', 'read:files'],
          dependencies: [
            { name: 'socket.io-client', version: '^4.7.0' },
            { name: 'react-dropzone', version: '^14.2.0' }
          ],
          pricing: {
            type: 'freemium',
            trialDays: 30
          },
          ratings: {
            average: 4.2,
            count: 1256,
            distribution: { 1: 12, 2: 34, 3: 167, 4: 543, 5: 500 }
          },
          stats: {
            downloads: 8934,
            activeInstallations: 4567,
            lastUpdated: '2024-09-01T14:20:00Z',
            createdAt: '2024-01-10T09:00:00Z'
          },
          compatibility: {
            shellVersion: '>=1.0.0'
          },
          license: 'Apache-2.0',
          featured: false,
          verified: false,
          status: 'published'
        },
        {
          id: 'security-monitor',
          name: 'security-monitor',
          displayName: 'Security Monitor',
          description: 'Advanced security monitoring and threat detection system',
          longDescription: 'Monitor your application security with real-time threat detection, vulnerability scanning, and compliance reporting. Includes automated alerts and detailed security analytics.',
          version: '3.0.0-beta.2',
          author: {
            name: 'SecureWorks',
            verified: true
          },
          category: 'developer-tools',
          tags: ['security', 'monitoring', 'threats', 'compliance', 'alerts'],
          icon: '🔒',
          screenshots: ['/screenshots/security-monitor-1.png', '/screenshots/security-monitor-2.png'],
          remoteUrl: 'https://cdn.marketplace.com/plugins/security-monitor/remoteEntry.js',
          exposedModule: './SecurityMonitor',
          permissions: ['admin:settings', 'read:analytics', 'read:users'],
          dependencies: [],
          pricing: {
            type: 'paid',
            price: 99.99,
            currency: 'USD'
          },
          ratings: {
            average: 4.9,
            count: 543,
            distribution: { 1: 2, 2: 5, 3: 23, 4: 98, 5: 415 }
          },
          stats: {
            downloads: 2341,
            activeInstallations: 1876,
            lastUpdated: '2024-08-30T16:45:00Z',
            createdAt: '2023-11-20T11:00:00Z'
          },
          compatibility: {
            shellVersion: '>=1.2.0',
            nodeVersion: '>=18.0.0'
          },
          repository: {
            type: 'git',
            url: 'https://github.com/secureworks/security-monitor-plugin'
          },
          license: 'Commercial',
          featured: true,
          verified: true,
          status: 'beta'
        },
        {
          id: 'simple-notes',
          name: 'simple-notes',
          displayName: 'Simple Notes',
          description: 'Lightweight note-taking plugin with markdown support',
          longDescription: 'A minimalist note-taking solution with markdown editing, tagging, and search functionality. Perfect for quick notes and documentation.',
          version: '1.0.3',
          author: {
            name: 'John Developer',
            verified: false
          },
          category: 'productivity',
          tags: ['notes', 'markdown', 'productivity', 'simple'],
          icon: '📝',
          screenshots: ['/screenshots/simple-notes-1.png'],
          remoteUrl: 'https://cdn.marketplace.com/plugins/simple-notes/remoteEntry.js',
          exposedModule: './SimpleNotes',
          permissions: ['read:files', 'write:files'],
          dependencies: [
            { name: 'react-markdown', version: '^8.0.0' }
          ],
          pricing: {
            type: 'free'
          },
          ratings: {
            average: 3.8,
            count: 234,
            distribution: { 1: 8, 2: 12, 3: 45, 4: 98, 5: 71 }
          },
          stats: {
            downloads: 1456,
            activeInstallations: 892,
            lastUpdated: '2024-07-15T09:30:00Z',
            createdAt: '2024-06-01T12:00:00Z'
          },
          compatibility: {
            shellVersion: '>=1.0.0'
          },
          license: 'MIT',
          featured: false,
          verified: false,
          status: 'published'
        }
      ];

      setPlugins(mockPlugins);
    } catch (error) {
      console.error('Failed to load marketplace plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedPlugins = useMemo(() => {
    let filtered = plugins.filter(plugin => {
      const matchesSearch = searchTerm === '' || 
        plugin.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
      const matchesPricing = selectedPricing === 'all' || plugin.pricing.type === selectedPricing;
      
      return matchesSearch && matchesCategory && matchesPricing;
    });

    // Sort plugins
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'downloads':
          comparison = a.stats.downloads - b.stats.downloads;
          break;
        case 'rating':
          comparison = a.ratings.average - b.ratings.average;
          break;
        case 'updated':
          comparison = new Date(a.stats.lastUpdated).getTime() - new Date(b.stats.lastUpdated).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Featured plugins first
    return filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return 0;
    });
  }, [plugins, searchTerm, selectedCategory, selectedPricing, sortBy, sortOrder]);

  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstallingPlugins(prev => new Set([...prev, plugin.id]));
    
    try {
      await onInstall(plugin);
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setInstallingPlugins(prev => {
        const newSet = new Set(prev);
        newSet.delete(plugin.id);
        return newSet;
      });
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      await onUninstall(pluginId);
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const getStatusBadge = (status: MarketplacePlugin['status']) => {
    const badges = {
      published: 'bg-green-100 text-green-800',
      beta: 'bg-yellow-100 text-yellow-800',
      alpha: 'bg-orange-100 text-orange-800',
      deprecated: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={clsx('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', badges[status])}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getPricingBadge = (pricing: MarketplacePlugin['pricing']) => {
    if (pricing.type === 'free') {
      return <span className="text-green-600 font-medium">Free</span>;
    } else if (pricing.type === 'freemium') {
      return <span className="text-blue-600 font-medium">Freemium</span>;
    } else {
      return <span className="text-purple-600 font-medium">${pricing.price}</span>;
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={clsx(
              'h-4 w-4',
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Package className="h-8 w-8 text-blue-600 mr-3" />
                Plugin Marketplace
              </h1>
              <p className="text-gray-600 mt-2">Discover and install plugins to extend your Shell Platform</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={clsx(
                    'p-2 rounded',
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={clsx(
                    'p-2 rounded',
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search plugins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Pricing Filter */}
            <div>
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {pricingOptions.map(option => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All Pricing' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="downloads">Downloads</option>
                <option value="rating">Rating</option>
                <option value="updated">Last Updated</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredAndSortedPlugins.length} of {plugins.length} plugins
          </p>
        </div>

        {/* Plugin Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPlugins.map((plugin) => (
              <div key={plugin.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="text-3xl mr-3">{plugin.icon || '🧩'}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center">
                          {plugin.displayName}
                          {plugin.verified && (
                            <CheckCircle className="h-4 w-4 text-blue-500 ml-2" />
                          )}
                          {plugin.featured && (
                            <Star className="h-4 w-4 text-yellow-500 ml-1" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600">by {plugin.author.name}</p>
                      </div>
                    </div>
                    {getStatusBadge(plugin.status)}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{plugin.description}</p>

                  <div className="flex items-center justify-between mb-4">
                    {renderStars(plugin.ratings.average)}
                    <span className="text-sm text-gray-500">({plugin.ratings.count})</span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    {getPricingBadge(plugin.pricing)}
                    <div className="flex items-center text-sm text-gray-500">
                      <Download className="h-3 w-3 mr-1" />
                      {plugin.stats.downloads.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {plugin.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {plugin.tags.length > 3 && (
                      <span className="text-xs text-gray-500">+{plugin.tags.length - 3} more</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(plugin.stats.lastUpdated).toLocaleDateString()}
                    </div>
                    
                    {installedPlugins.includes(plugin.id) ? (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Uninstall
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(plugin)}
                        disabled={installingPlugins.has(plugin.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {installingPlugins.has(plugin.id) ? (
                          <Loader className="h-3 w-3 animate-spin" />
                        ) : (
                          'Install'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            {filteredAndSortedPlugins.map((plugin) => (
              <div key={plugin.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="text-3xl mr-4">{plugin.icon || '🧩'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <h3 className="font-semibold text-gray-900 flex items-center">
                          {plugin.displayName}
                          {plugin.verified && (
                            <CheckCircle className="h-4 w-4 text-blue-500 ml-2" />
                          )}
                          {plugin.featured && (
                            <Star className="h-4 w-4 text-yellow-500 ml-1" />
                          )}
                        </h3>
                        <div className="ml-3">
                          {getStatusBadge(plugin.status)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">by {plugin.author.name}</p>
                      <p className="text-gray-600 mb-3">{plugin.description}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          {renderStars(plugin.ratings.average)}
                          <span className="ml-1">({plugin.ratings.count})</span>
                        </div>
                        <div className="flex items-center">
                          <Download className="h-3 w-3 mr-1" />
                          {plugin.stats.downloads.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(plugin.stats.lastUpdated).toLocaleDateString()}
                        </div>
                        <div>
                          {getPricingBadge(plugin.pricing)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6">
                    {installedPlugins.includes(plugin.id) ? (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Uninstall
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(plugin)}
                        disabled={installingPlugins.has(plugin.id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                      >
                        {installingPlugins.has(plugin.id) ? (
                          <>
                            <Loader className="h-3 w-3 animate-spin mr-2" />
                            Installing...
                          </>
                        ) : (
                          'Install'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredAndSortedPlugins.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
            <p className="text-gray-500">Try adjusting your search criteria or browse different categories</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginMarketplace;