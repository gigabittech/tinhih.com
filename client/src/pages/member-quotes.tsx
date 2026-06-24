import { useState, useEffect } from "react";
import { MemberLayout } from "@/components/layout/member-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { usePageTitle } from "@/context/page-context";
import { format } from "date-fns";
import { Quote, Search, Filter, Heart, Share2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
}

export default function MemberQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();
  const { setPageInfo } = usePageTitle();

  useEffect(() => {
    setPageInfo("Inspirational Quotes", "Discover motivational quotes for your wellness journey");
  }, [setPageInfo]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/quotes");
      if (response.success) {
        const quotesData = response.data || response;
        setQuotes(quotesData);
        setFilteredQuotes(quotesData);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch quotes",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchTerm, categoryFilter]);

  const filterQuotes = () => {
    let filtered = quotes.filter((quote) => quote.isActive);

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (quote) =>
          quote.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((quote) => quote.category === categoryFilter);
    }

    // Sort by featured first, then by display order
    filtered.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.displayOrder - a.displayOrder;
    });

    setFilteredQuotes(filtered);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      health: "bg-blue-100 text-blue-800",
      wellness: "bg-green-100 text-green-800",
      motivation: "bg-yellow-100 text-yellow-800",
      recovery: "bg-purple-100 text-purple-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const toggleFavorite = (quoteId: string) => {
    setFavorites(prev => 
      prev.includes(quoteId) 
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const shareQuote = (quote: Quote) => {
    const text = `"${quote.text}" - ${quote.author}`;
    if (navigator.share) {
      navigator.share({
        title: 'TiNHiH Quote',
        text: text,
      });
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Quote Copied",
        description: "Quote has been copied to clipboard",
      });
    }
  };

  const categories = ["all", "general", "health", "wellness", "motivation", "recovery"];

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffdd00]"></div>
          <span className="ml-2 text-gray-600">Loading inspirational quotes...</span>
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-4 sm:py-6 lg:py-8">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-full bg-gradient-to-r from-[#ffdd00] to-yellow-400 shadow-lg">
              <Quote className="h-6 w-6 sm:h-8 sm:w-8 text-black" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Inspirational Quotes
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Discover motivational quotes to inspire your wellness journey and support your mental health
          </p>
        </div>

        {/* Search and Filter */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search quotes, authors, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredQuotes.map((quote) => (
            <Card 
              key={quote.id} 
              className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                quote.isFeatured ? 'ring-2 ring-[#ffdd00]' : ''
              }`}
            >
              <CardContent className="p-4 sm:p-6">
                {quote.isFeatured && (
                  <Badge className="mb-4 bg-gradient-to-r from-[#ffdd00] to-yellow-400 text-black font-semibold">
                    <Heart className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                
                <blockquote className="text-base sm:text-lg italic text-gray-700 mb-4 leading-relaxed">
                  "{quote.text}"
                </blockquote>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <p className="font-semibold text-gray-900">
                    — {quote.author}
                  </p>
                  <Badge className={getCategoryColor(quote.category)}>
                    {quote.category}
                  </Badge>
                </div>

                {/* Tags */}
                {quote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {quote.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(quote.id)}
                      className={`hover:bg-red-50 ${
                        favorites.includes(quote.id) ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${favorites.includes(quote.id) ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => shareQuote(quote)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(new Date(quote.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredQuotes.length === 0 && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 sm:p-12 text-center">
              <Quote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No quotes found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || categoryFilter !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "Check back soon for new inspirational quotes"
                }
              </p>
              {(searchTerm || categoryFilter !== "all") && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                  }}
                  className="border-[#ffdd00] text-[#ffdd00] hover:bg-[#ffdd00] hover:text-black"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  );
}
