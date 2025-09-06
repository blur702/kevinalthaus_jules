import React, { ReactNode } from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps } from '../../../types';

/**
 * Footer link interface
 */
interface FooterLink {
  id: string;
  label: string;
  href: string;
  external?: boolean;
}

/**
 * Footer section interface
 */
interface FooterSection {
  id: string;
  title: string;
  links: FooterLink[];
}

/**
 * Extended footer props interface
 */
export interface FooterProps extends BaseComponentProps {
  /**
   * Footer sections with links
   */
  sections?: FooterSection[];
  
  /**
   * Copyright text
   */
  copyright?: string | ReactNode;
  
  /**
   * Company name
   */
  companyName?: string;
  
  /**
   * Additional footer content
   */
  children?: ReactNode;
  
  /**
   * Social media links
   */
  socialLinks?: FooterLink[];
  
  /**
   * Legal links (Privacy Policy, Terms of Service, etc.)
   */
  legalLinks?: FooterLink[];
  
  /**
   * Maximum width of the footer content
   * @default 'lg'
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  
  /**
   * Footer background variant
   * @default 'default'
   */
  variant?: 'default' | 'dark' | 'transparent';
  
  /**
   * Whether to show a divider at the top
   * @default true
   */
  showDivider?: boolean;
  
  /**
   * Custom logo or branding element
   */
  logo?: ReactNode;
}

/**
 * Styled footer container
 */
const FooterContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'variant',
})<{ variant?: string }>(({ theme, variant }) => ({
  marginTop: 'auto',
  padding: theme.spacing(4, 0, 2),
  
  ...(variant === 'dark' && {
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
  }),
  
  ...(variant === 'transparent' && {
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
  }),
  
  ...(variant === 'default' && {
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
  }),
}));

/**
 * Footer section container
 */
const FooterSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  
  [theme.breakpoints.up('md')]: {
    marginBottom: theme.spacing(2),
  },
}));

/**
 * Footer link styled component
 */
const FooterLink = styled(Link)(({ theme }) => ({
  display: 'block',
  color: 'inherit',
  textDecoration: 'none',
  marginBottom: theme.spacing(1),
  transition: theme.transitions.create('color', {
    duration: theme.transitions.duration.short,
  }),
  
  '&:hover': {
    color: theme.palette.primary.main,
    textDecoration: 'underline',
  },
  
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
    borderRadius: theme.shape.borderRadius,
  },
}));

/**
 * Shell Platform Footer component
 * 
 * A comprehensive footer component with sections, links, social media integration,
 * and responsive layout. Supports multiple variants and customization options.
 * 
 * @example
 * ```tsx
 * <Footer
 *   companyName="Shell Platform"
 *   copyright="© 2024 Shell Platform. All rights reserved."
 *   sections={[
 *     {
 *       id: "products",
 *       title: "Products",
 *       links: [
 *         { id: "dashboard", label: "Dashboard", href: "/dashboard" },
 *         { id: "analytics", label: "Analytics", href: "/analytics" }
 *       ]
 *     }
 *   ]}
 *   legalLinks={[
 *     { id: "privacy", label: "Privacy Policy", href: "/privacy" },
 *     { id: "terms", label: "Terms of Service", href: "/terms" }
 *   ]}
 * />
 * ```
 */
export const Footer: React.FC<FooterProps> = ({
  sections = [],
  copyright,
  companyName,
  children,
  socialLinks = [],
  legalLinks = [],
  maxWidth = 'lg',
  variant = 'default',
  showDivider = true,
  logo,
  className,
  style,
  sx,
  testId,
  ...rest
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Generate copyright text if company name is provided but no custom copyright
  const displayCopyright = copyright || (companyName && `© ${new Date().getFullYear()} ${companyName}. All rights reserved.`);

  return (
    <FooterContainer
      component="footer"
      variant={variant}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      {...rest}
    >
      {showDivider && variant === 'default' && (
        <Divider sx={{ mb: 4 }} />
      )}
      
      <Container maxWidth={maxWidth}>
        {/* Main footer content */}
        <Grid container spacing={4}>
          {/* Logo and company info */}
          {(logo || companyName) && (
            <Grid item xs={12} md={3}>
              <FooterSection>
                {logo && (
                  <Box sx={{ mb: 2 }}>
                    {logo}
                  </Box>
                )}
                {companyName && !logo && (
                  <Typography variant="h6" gutterBottom>
                    {companyName}
                  </Typography>
                )}
              </FooterSection>
            </Grid>
          )}
          
          {/* Footer sections */}
          {sections.map((section) => (
            <Grid item xs={12} sm={6} md={sections.length > 3 ? 2 : 3} key={section.id}>
              <FooterSection>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  {section.title}
                </Typography>
                {section.links.map((link) => (
                  <FooterLink
                    key={link.id}
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    variant="body2"
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </FooterSection>
            </Grid>
          ))}
          
          {/* Social links */}
          {socialLinks.length > 0 && (
            <Grid item xs={12} md={3}>
              <FooterSection>
                <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                  Connect
                </Typography>
                {socialLinks.map((link) => (
                  <FooterLink
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                  >
                    {link.label}
                  </FooterLink>
                ))}
              </FooterSection>
            </Grid>
          )}
        </Grid>

        {/* Custom children content */}
        {children && (
          <Box sx={{ mt: 4, mb: 2 }}>
            {children}
          </Box>
        )}

        {/* Bottom bar */}
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            pt: 3,
            mt: 4,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 2,
          }}
        >
          {/* Copyright */}
          {displayCopyright && (
            <Typography variant="body2" color="text.secondary">
              {displayCopyright}
            </Typography>
          )}

          {/* Legal links */}
          {legalLinks.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                mt: isMobile ? 2 : 0,
              }}
            >
              {legalLinks.map((link, index) => (
                <React.Fragment key={link.id}>
                  <FooterLink
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    variant="body2"
                    sx={{ mb: 0 }}
                  >
                    {link.label}
                  </FooterLink>
                  {index < legalLinks.length - 1 && (
                    <Typography variant="body2" color="text.secondary">
                      •
                    </Typography>
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}
        </Box>
      </Container>
    </FooterContainer>
  );
};