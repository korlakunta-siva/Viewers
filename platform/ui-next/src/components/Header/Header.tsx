import React, { ReactNode } from 'react';
import classNames from 'classnames';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  ToolButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick?: () => void;
    component?: React.ComponentType;
  }>;
  actionItems?: Array<{
    title: string;
    icon: string;
    onClick: () => void;
    tooltip?: string;
    component?: React.ComponentType;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
}

function Header({
  children,
  menuOptions,
  actionItems = [],
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  UndoRedo,
  Secondary,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  return (
    <TooltipProvider>
      <IconPresentationProvider
        size="large"
        IconContainer={ToolButton}
      >
        <NavBar
          isSticky={isSticky}
          {...props}
        >
          <div className="relative h-[48px] items-center">
            <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center">
              <div
                className={classNames(
                  'mr-3 inline-flex items-center',
                  isReturnEnabled && 'cursor-pointer'
                )}
                onClick={onClickReturn}
                data-cy="return-to-work-list"
              >
                {isReturnEnabled && <Icons.ArrowLeft className="text-primary ml-1 h-7 w-7" />}
                <div className="ml-1">
                  {WhiteLabeling?.createLogoComponentFn?.(React, props) || <Icons.OHIFLogo />}
                </div>
              </div>
            </div>
            <div className="absolute top-1/2 left-[250px] h-8 -translate-y-1/2">{Secondary}</div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
              <div className="flex items-center justify-center space-x-2">{children}</div>
            </div>
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 select-none items-center">
              {UndoRedo}
              {PatientInfo}
              {/* Action items (direct icons) */}
              {actionItems.map((action, index) => {
                // If action has a component, render it directly
                if ((action as any).component) {
                  const Component = (action as any).component;
                  return <Component key={index} />;
                }

                return (
                  <React.Fragment key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:bg-primary-dark mx-2 h-full"
                          onClick={action.onClick}
                          title={action.tooltip ? undefined : (action.title || undefined)}
                        >
                          <Icons.ByName name={action.icon} />
                        </Button>
                      </TooltipTrigger>
                      {action.tooltip && (
                        <TooltipContent side="bottom">
                          {action.tooltip}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </React.Fragment>
                );
              })}
              <div className="flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-primary hover:bg-primary-dark mt-2 h-full w-full"
                    >
                      <Icons.GearSettings />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {menuOptions.map((option, index) => {
                      // If option has a component, render it directly
                      if (option.component) {
                        const Component = option.component;
                        return <Component key={index} />;
                      }

                      const IconComponent = option.icon
                        ? Icons[option.icon as keyof typeof Icons]
                        : null;
                      return (
                        <DropdownMenuItem
                          key={index}
                          onSelect={option.onClick}
                          className="flex items-center gap-2 py-2"
                        >
                          {IconComponent && (
                            <span className="flex h-4 w-4 items-center justify-center">
                              <Icons.ByName name={option.icon} />
                            </span>
                          )}
                          <span className="flex-1">{option.title}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </NavBar>
      </IconPresentationProvider>
    </TooltipProvider>
  );
}

export default Header;
