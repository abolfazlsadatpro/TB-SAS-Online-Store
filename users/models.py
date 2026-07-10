from django.db import models
from django.contrib.auth.models import (AbstractBaseUser, PermissionsMixin, BaseUserManager)


class CustomContextManager(BaseUserManager):

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        if extra.get('is_staff') is not True:
            raise ValueError('is_staff must be True')
        if extra.get('is_superuser') is not True:
            raise ValueError('is_superuser must be True')

        return self.create_user(email, password, **extra)


class PersonUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, verbose_name='Email')
    first_name = models.CharField(max_length=40, blank=True, verbose_name='First Name')
    last_name = models.CharField(max_length=40, blank=True, verbose_name='Last Name')
    phone_number = models.CharField(max_length=15, unique=True, verbose_name='Phone Number')
    is_staff = models.BooleanField(default=False, verbose_name='Staff Status')
    is_active = models.BooleanField(default=True, verbose_name='Active')
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name='Date Joined')

    objects = CustomContextManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['phone_number']

    def __str__(self):
        return self.email
